import SwiftUI
import SwiftData

struct MessagesView: View {
    @Environment(AppState.self) private var state
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Message.timestamp, order: .forward) private var allMessages: [Message]
    @State private var draft = ""
    @State private var errorMessage: String?

    private var messages: [Message] {
        guard let code = state.activeTeamCode else { return [] }
        return allMessages.filter { $0.team?.code == code }
    }

    var body: some View {
        VStack(spacing: 0) {
            if state.activeTeamCode == nil {
                ContentUnavailableView(
                    "No team selected",
                    systemImage: "bubble.left.and.bubble.right",
                    description: Text("Create or activate a team first so messages stay with the squad.")
                )
                .foregroundStyle(Color.glMuted)
            } else {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: 10) {
                            ForEach(messages, id: \.id) { msg in
                                messageBubble(msg).id(msg.id)
                            }
                        }
                        .padding(14)
                    }
                    .onChange(of: messages.count) { _, _ in
                        if let last = messages.last {
                            withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                        }
                    }
                }

                HStack(spacing: 10) {
                    TextField("Message the squad…", text: $draft, axis: .vertical)
                        .lineLimit(1...4)
                        .padding(10)
                        .background(Color.glPanel)
                        .clipShape(RoundedRectangle(cornerRadius: 10))
                        .foregroundStyle(Color.glText)

                    Button { send() } label: {
                        Image(systemName: "paperplane.fill")
                            .font(.system(size: 16, weight: .semibold))
                            .foregroundStyle(.white)
                            .frame(width: 40, height: 40)
                            .background(Color.glAccent)
                            .clipShape(Circle())
                    }
                    .disabled(draft.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
                .padding(12)
                .background(Color.glNavy2)
            }
        }
        .background(Color.glNavy)
        .navigationTitle("Messages")
        .alert("Can’t save", isPresented: Binding(
            get: { errorMessage != nil },
            set: { if !$0 { errorMessage = nil } }
        )) {
            Button("OK", role: .cancel) { errorMessage = nil }
        } message: {
            Text(errorMessage ?? "")
        }

        .navigationBarTitleDisplayMode(.inline)
    }

    private func messageBubble(_ msg: Message) -> some View {
        HStack {
            if msg.fromCoach { Spacer(minLength: 40) }
            VStack(alignment: msg.fromCoach ? .trailing : .leading, spacing: 3) {
                Text(msg.fromCoach ? state.coachName : "Player")
                    .font(.caption2.weight(.semibold)).foregroundStyle(Color.glMuted)
                Text(msg.body)
                    .font(.subheadline).foregroundStyle(Color.glText)
                    .padding(10)
                    .background(msg.fromCoach ? Color.glAccent.opacity(0.25) : Color.glPanel)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                Text(msg.timestamp, style: .time)
                    .font(.caption2).foregroundStyle(Color.glDim)
            }
            if !msg.fromCoach { Spacer(minLength: 40) }
        }
    }

    private func send() {
        guard AttackDefense.allowSave(AttackDefense.Action.messageSend) else {
            errorMessage = AttackDefense.rateLimitMessage
            return
        }
        let check = GridSecurity.requireMessage(draft)
        guard check.isOK else {
            errorMessage = check.firstMessage
            return
        }
        let text = GridSecurity.sanitize(draft, max: GridSecurity.Limits.message)
        let msg = Message(fromCoach: true, body: text)
        modelContext.insert(msg)
        GridlockAgent.save(modelContext, label: "message")
        draft = ""
    }
}
