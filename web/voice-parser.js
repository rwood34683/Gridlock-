(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.GridlockVoiceParser = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // This parser proposes only what a coach actually said. It never estimates
  // positions, invents a victim from someone firing, or resolves duplicate
  // bunker calls by choosing the first bunker in the layout.
  var units = {zero:0,oh:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,
    ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19};
  var tens = {twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90};
  var joined = {};
  Object.keys(tens).forEach(function (t) {
    Object.keys(units).filter(function (u) { return units[u] > 0 && units[u] < 10; }).forEach(function (u) {
      joined[t + u] = tens[t] + units[u];
    });
  });
  function own(object, key) { return Object.prototype.hasOwnProperty.call(object, key); }
  function tokens(value) {
    var text = String(value == null ? "" : value).normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    text = text.replace(/\bno\.(?=\s*(?:\d|one|two|three|four|five|six|seven|eight|nine|ten))/g, "no ")
      .replace(/([\p{L}\p{N}])['’]s\b/gu, "$1 is").replace(/['’]/g, "")
      .replace(/([\p{L}])\s*#\s*(?=\d)/gu, "$1 ");
    var words = text.match(/#|\d+|[\p{L}]+|[.,;!?\n]/gu) || [];
    var result = [];
    for (var i = 0; i < words.length; i++) {
      var word = words[i];
      if (own(tens, word)) {
        var number = tens[word];
        if (own(units, words[i + 1]) && units[words[i + 1]] > 0 && units[words[i + 1]] < 10) number += units[words[++i]];
        result.push(String(number));
      } else if (own(units, word)) result.push(String(units[word]));
      else if (own(joined, word)) result.push(String(joined[word]));
      else result.push(word);
    }
    return result;
  }
  function words(value) { return tokens(value).filter(function (t) { return !/^[.,;!?\n]$/.test(t); }); }
  function phraseAt(haystack, needle, index) {
    return needle.length && needle.every(function (part, i) { return haystack[index + i] === part; });
  }
  function numberOf(value) {
    var list = words(value);
    return list.length === 1 && /^\d{1,3}$/.test(list[0]) ? String(Number(list[0])) : "";
  }
  function playerLabel(player) {
    return String(player.name || (player.num !== undefined && player.num !== "" ? "#" + player.num : player.key || ""));
  }
  function prepare(context) {
    var players = (Array.isArray(context.players) ? context.players : []).filter(function (p) { return p && typeof p.key === "string" && p.key; });
    var names = [];
    players.forEach(function (p) {
      var name = words(p.name || "");
      if (!name.length) return;
      var aliases = [name];
      if (name.length > 1) {
        if (name[0].length >= 3) aliases.push([name[0]]);
        if (name[name.length - 1].length >= 3) aliases.push([name[name.length - 1]]);
      }
      aliases.forEach(function (alias) { names.push({tokens:alias,player:p}); });
    });
    var bunkers = [];
    (Array.isArray(context.bunkers) ? context.bunkers : []).forEach(function (b) {
      if (!b || typeof b.id !== "string" || !b.id) return;
      var aliases = [b.id,b.name].concat(Array.isArray(b.aliases) ? b.aliases : []), seen = new Set();
      aliases.forEach(function (alias) {
        if (typeof alias !== "string") return;
        var normalized = words(alias), key = normalized.join(" ");
        if (!key || seen.has(key)) return;
        seen.add(key); bunkers.push({tokens:normalized,bunker:b});
      });
    });
    return {players:players,names:names,bunkers:bunkers};
  }
  function longestMatches(matches) {
    // Full names/calls outrank contained shorthand. Identical spans with
    // different identities survive, so their ambiguity remains visible.
    return matches.filter(function (match) {
      return !matches.some(function (other) {
        return other.start <= match.start && other.end >= match.end && other.end - other.start > match.end - match.start;
      });
    });
  }
  function references(list, data) {
    var refs = [];
    for (var i = 0; i < list.length; i++) {
      var start = i, at = i, explicit = false;
      if (["number","player","jersey","opponent","no","#"].indexOf(list[i]) >= 0) {
        explicit = true; at++;
        if (list[at] === "number" || list[at] === "is") at++;
      } else if (i === 0 && /^\d{1,3}$/.test(list[i]) && !/^(players|opponents|men|guys|bodies)$/.test(list[i + 1] || "")) {
        explicit = true;
      }
      if (explicit && /^\d{1,3}$/.test(list[at] || "")) {
        var number = String(Number(list[at]));
        var matches = data.players.filter(function (p) { return numberOf(p.num) === number; });
        if (!matches.length) matches = [{key:"number:" + number,num:number,name:"#" + number}];
        matches.forEach(function (p) { refs.push({start:start,end:at + 1,player:p,source:"number"}); });
        i = at;
      }
    }
    var names = [];
    data.names.forEach(function (entry) {
      for (var i = 0; i <= list.length - entry.tokens.length; i++) {
        if (phraseAt(list, entry.tokens, i)) names.push({start:i,end:i + entry.tokens.length,player:entry.player,source:"name"});
      }
    });
    return refs.concat(longestMatches(names));
  }
  function action(list) {
    var text = " " + list.join(" ") + " ";
    var out = /\b(?:eliminated|elimination)\b/.test(text) || /\bout\b(?!\s+(?:of|from|to|wide|there)\b)/.test(text);
    if (out) return "out";
    if (/\b(?:got|gets|was|is|been|being)\s+(?:a\s+)?(?:hit|shot)\b|\btook\s+(?:a\s+)?hit\b/.test(text)) return "hit";
    if (/\bhit\b/.test(text)) return "hit";
    if (/\b(?:ran|run|runs|running|moved|move|moves|moving|went|goes|heading|headed|rotated|rotating|rotates)\b|\b(?:at|in|behind)\b|\bout\s+of\b/.test(text)) return "move";
    return "note";
  }
  function negation(list) {
    return list.some(function (word, i) {
      return /^(not|never|isnt|wasnt|arent|werent|didnt|doesnt|dont|hasnt|havent|cant|cannot|without)$/.test(word)
        || word === "no" && !/^\d+$/.test(list[i + 1] || "");
    });
  }
  function uncertain(list) {
    return list.some(function (word) { return /^(might|may|maybe|possibly|probably|perhaps|think|thinking|looks|seems|apparently|unsure|uncertain|could|guess)$/.test(word); });
  }
  function subjectProblem(list, refs, kind) {
    var occupied = new Set();
    refs.forEach(function (ref) { for (var i = ref.start; i < ref.end; i++) occupied.add(i); });
    var stop = list.findIndex(function (word) { return /^(is|are|was|were|has|got|gets|been|took|out|eliminated|hit|shot|ran|run|runs|running|move|moved|moves|moving|went|goes|at|in|behind|headed|heading|rotated|rotating)$/.test(word); });
    if (stop < 0) stop = list.length;
    var prefix = list.slice(0,stop).filter(function (word,i) { return !occupied.has(i); });
    if (prefix.some(function (word) { return /^(they|them|both|players|opponents|guys|men|bodies)$/.test(word); })) return "More than one or an unidentified player was described.";
    var allowed = /^(i|we|see|saw|heard|hear|think|maybe|perhaps|probably|possibly|looks|like|it|he|she|his|her|the|a|an|player|opponent|just|now|then|still|actually|number|jersey|no|#|might|may|could|not)$/;
    var unknown = prefix.filter(function (word) { return !allowed.test(word); });
    if (unknown.length) return "The named or described player is not uniquely identified.";
    if (list.some(function (word,i) { return /^(number|jersey|no|#)$/.test(word) && !/^\d{1,3}$/.test(list[i + 1] || "") && list[i + 1] !== "is"; })) return "The jersey number was not understood.";
    return "";
  }
  function clauses(all, data) {
    var sections = [], buffer = [];
    all.forEach(function (word) {
      if (/^[.,;!?\n]$/.test(word)) { if (buffer.length) sections.push(buffer); buffer = []; }
      else buffer.push(word);
    });
    if (buffer.length) sections.push(buffer);
    var result = [];
    sections.forEach(function (section) {
      var start = 0;
      for (var i = 0; i < section.length; i++) {
        if (["and","then","also"].indexOf(section[i]) < 0) continue;
        var next = i + 1;
        while (["and","then","also"].indexOf(section[next]) >= 0) next++;
        var before = section.slice(start,i), after = section.slice(next);
        if (action(before) === "note" || action(after) === "note") continue;
        var nextRefs = references(after,data), beginsPlayer = nextRefs.some(function (r) { return r.start <= 1; });
        var continuation = /^(he|she|is|was|got|out|eliminated|ran|moved|went|hit|at|then|now)$/.test(after[0] || "");
        if (beginsPlayer || continuation || subjectProblem(after,nextRefs,action(after))) {
          result.push(before); start = next; i = next - 1;
        }
      }
      if (section.slice(start).length) result.push(section.slice(start));
    });
    return result;
  }
  function location(list, data, kind, refs) {
    var found = [];
    data.bunkers.forEach(function (entry) {
      for (var i = 0; i <= list.length - entry.tokens.length; i++) {
        if (phraseAt(list,entry.tokens,i)) found.push({start:i,end:i + entry.tokens.length,bunker:entry.bunker});
      }
    });
    found = longestMatches(found).filter(function (match) {
      return !refs.some(function (ref) { return ref.start <= match.start && ref.end >= match.end; });
    });
    // "From A to B" names a source as well as a destination. Only the alias
    // after "to" locates the arrival; two choices after it remain ambiguous.
    var to = list.lastIndexOf("to");
    if (kind === "move" && to >= 0) found = found.filter(function (match) { return match.start > to; });
    if (kind === "move" && to < 0) found = found.filter(function (match) {
      var before = list.slice(0,match.start), from = before.lastIndexOf("from"), at = Math.max(before.lastIndexOf("at"),before.lastIndexOf("in"),before.lastIndexOf("behind"));
      for (var i = 1; i < before.length; i++) if (before[i] === "of" && before[i - 1] === "out") from = i;
      return from < 0 || at > from;
    });
    if (kind !== "move") found = found.filter(function (match) {
      var before = list.slice(0,match.start), from = before.lastIndexOf("from"), at = Math.max(before.lastIndexOf("at"),before.lastIndexOf("in"),before.lastIndexOf("behind"));
      return from < 0 || at > from;
    });
    var unique = new Map();
    found.forEach(function (match) { unique.set(match.bunker.id,match.bunker); });
    if (unique.size > 1) return {bunker:null,reason:"The bunker call matches multiple positions; select the exact bunker."};
    if (unique.size === 1) return {bunker:Array.from(unique.values())[0],reason:""};
    var saysLocation = kind === "move" || list.some(function (word) { return /^(at|in|behind|to|bunker)$/.test(word); });
    return {bunker:null,reason:saysLocation ? "The location does not match an exact bunker call on this field." : ""};
  }
  function locationConcern(list, kind, refs) {
    var place = list.findIndex(function (word) { return /^(at|in|behind|to|toward|towards)$/.test(word); });
    var subject = refs.length ? Math.min.apply(null,refs.map(function (ref) { return ref.start; })) : -1;
    var attention = list.findIndex(function (word,index) {
      return index > subject && /^(look|looks|looked|looking|aim|aims|aimed|aiming|watch|watches|watched|watching|see|sees|saw|seeing|cover|covers|covering|lane|lanes|laning|shoot|shoots|shooting|fire|fires|firing)$/.test(word);
    });
    if (attention >= 0 && (place < 0 || attention < place)) {
      return "Looking, aiming, watching or firing toward a bunker does not establish the player's position.";
    }
    var text = list.join(" ");
    if (/\b(?:being|getting)\s+(?:shot|fired)\s+at\b/.test(text)) {
      return "Being shot at describes incoming fire, not a confirmed hit or position.";
    }
    // The passive subject is the casualty, but an at-location following the
    // shooter's identity can describe either person. Never attach it silently.
    var by = list.indexOf("by");
    if ((kind === "hit" || kind === "out") && by >= 0 && list.slice(by + 1).some(function (word) { return /^(at|in|behind)$/.test(word); })) {
      return "The location after the shooter's identity is ambiguous; confirm the observed player's bunker.";
    }
    return "";
  }
  function parse(text, context) {
    text = String(text == null ? "" : text);
    if (!text.trim()) return [];
    context = context || {};
    var data = prepare(context), sections = clauses(tokens(text),data);
    if (!sections.length) return [{text:text,player:"",playerName:"",kind:"note",bunker:"",bunkerName:"",review:true,reason:"No clear event was understood."}];
    var previous = null, previousAmbiguous = false;
    return sections.map(function (list) {
      var refs = references(list,data), unique = new Map(), kind = action(list), reasons = [];
      refs.forEach(function (ref) { unique.set(ref.player.key,ref.player); });
      var problem = subjectProblem(list,refs,kind), player = null;
      if (unique.size > 1) reasons.push("Multiple players appear in one action; identify who moved, was hit or went out.");
      else if (problem) reasons.push(problem);
      else if (unique.size === 1) player = Array.from(unique.values())[0];
      else if (previous && !previousAmbiguous) player = previous;
      else if (!previousAmbiguous && context.selectedPlayer && typeof context.selectedPlayer.key === "string" && context.selectedPlayer.key) player = context.selectedPlayer;
      else reasons.push("Say the player's name or jersey number, or select a player.");
      var shooting = list.some(function (word) { return /^(shot|shoot|shoots|shooting|fired|fires|firing)$/.test(word); });
      var passiveHit = /\b(?:got|gets|was|is|been|being)\s+(?:a\s+)?(?:hit|shot)\b/.test(list.join(" "));
      if (shooting && !passiveHit && kind !== "out") {
        kind = "note"; reasons.push("Firing a shot does not confirm who was hit or eliminated.");
      }
      var hit = list.indexOf("hit");
      if (hit >= 0 && !passiveHit && kind === "hit"
          && (hit === 0 || hit < list.length - 1 && !/^(at|in|behind|from)$/.test(list[hit + 1]))) {
        kind = "note"; reasons.push("The wording does not establish which player received the hit.");
      }
      if (unique.size > 1) { player = null; kind = "note"; }
      if (negation(list)) { kind = "note"; reasons.push("The event is negated; no movement, hit or elimination is confirmed."); }
      if (uncertain(list)) reasons.push("The description is uncertain; confirm it before treating it as observed.");
      var loc = location(list,data,kind,refs);
      if (loc.reason) reasons.push(loc.reason);
      var concern = locationConcern(list,kind,refs);
      if (concern) {
        loc.bunker = null; reasons.push(concern);
        if (kind === "move" || /\b(?:being|getting)\s+(?:shot|fired)\s+at\b/.test(list.join(" "))) kind = "note";
      }
      if (kind === "note" && !reasons.length) reasons.push("No clear movement, hit or elimination event was stated.");
      if (player) { previous = player; previousAmbiguous = false; }
      else { previous = null; previousAmbiguous = true; }
      return {text:text,player:player ? player.key : "",playerName:player ? playerLabel(player) : "",kind:kind,
        bunker:loc.bunker ? loc.bunker.id : "",bunkerName:loc.bunker ? String(loc.bunker.name || loc.bunker.id) : "",
        review:reasons.length > 0,reason:Array.from(new Set(reasons)).join(" ")};
    });
  }
  return {parse:parse};
});
