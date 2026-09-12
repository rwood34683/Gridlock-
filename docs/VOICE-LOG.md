# Scout voice log

Open **Scout → Voice log**, choose the opponent team, then select **Detect name or jersey number** or a specific player. **Manage team & players** opens the existing custom team/player controls. Return to Voice log and select the team you added.

Tap **Start listening**, allow the device's microphone/speech permissions, and say what happened. Pause between observations. Finalized phrases are saved automatically; live browser words are only a preview. Native recognition shows the text when the speech service finalizes the phrase. Timing and accuracy depend on the device, service, connection and field noise. There is no server-side transcription service or account to configure.

Examples:

- “Number seven is out.”
- “Alex is out and Jordan moved to Home.” (Alex and Jordan must be in the selected team's roster; Home must be a unique bunker call.)
- Select Jordan, then say “Moved to Home.”
- “Number twelve was hit.”

Unknown jersey numbers can be logged without a full roster. Names resolve against the chosen team's players. Unknown names, conflicting identities, uncertain or negated statements, and ambiguous locations stay in the history as **Needs review**. They do not add a confirmed route sighting until corrected. A generic bunker name may match several physical bunkers: use the exact field ID or set a unique team bunker call in Playbook. The field's calls are listed below the voice controls.

Each event keeps its transcript, player, team, field, match, point and time. Confident locations create linked sightings in **How did they get there?**. **View route** opens the correct event context. Voice events do not change the point score or guess which Tally slot represents a jersey number.

**Edit event** lets you correct player, event type, bunker and transcript. The original transcript remains available. A move needs a confirmed bunker to clear review; use Observation for a general note without a location. **Undo event** removes that event and its linked sighting while preserving other observations.

Stop listening before discussing something else. Leaving the screen, changing player/team/field/match/point, or putting the app in the background stops capture. Unfinished speech is not saved after stopping. Listening never restarts on app launch. Recognition failures leave completed events intact; use Start listening to retry, or type into **Or type an observation → Record text**. The app currently requests US English recognition.

Transcripts are stored locally, mirrored into native app storage, and included in full season backups. Squad-only copies exclude event history. Merge keeps existing records with the same ID; use Replace when intentionally restoring corrected versions of the same events from another copy. Exports and device backups are separate copies; deleting an event here does not remove those copies.

The device or browser's speech provider may process audio online and require internet. GRIDLOCK does not store audio. Browser support varies; native builds include the pinned Capacitor speech plugin plus iOS microphone/speech descriptions and Android microphone permission. Native permissions are requested only on Start. See the privacy page and native setup guides.

Automated checks simulate speech without opening a microphone. Test on actual iPhone and Android hardware before distributing a signed build, including denied permissions, interruptions, backgrounding and noisy-field recognition.
