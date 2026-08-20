# Lead and call workflow

The queue prioritizes overdue follow-ups, today's follow-ups, new leads, and eligible retry leads. A phone number is normalized and deduplicated within the organization during import.

Calling is seat-controlled. The web requires an online paired Android handset; Android-origin calls require a signed-in employee. Both create a call attempt before dialing and both are reconciled from Callyzer.

Each call attempt records exactly one of `HOT`, `WARM`, `COLD`, `NOT_INTERESTED`, or `FOLLOW_UP`, plus a mandatory free-text reason. A follow-up requires a timestamp. The attempt disposition updates the lead and creates a follow-up when needed.

Unsuccessful customer outcomes from Callyzer increment `attemptCount`. When the organization threshold is reached, the lead becomes `NOT_PICKED_UP`. Device/FCM technical failures do not count.
