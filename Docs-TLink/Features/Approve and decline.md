---
status: v1
---

# Approve and decline

**In short:** admin chooses Approve or Decline, picks a template or writes their own words, and confirms.

## What it does
- Choose **Approve** or **Decline**. Only the matching templates show (welcome messages for approving, reasons for declining). Picking one fills in the message, which admin can still edit. You can't decide without a message.
- Every decision asks "are you sure?" first, saying exactly what will happen.
- **Approve:** the student becomes a tutor for the modules where their mark reaches the minimum, and gets the message in their inbox. If some modules are below it, the screen says which ones won't be added. If none reach it, approving isn't possible. Next time they open the app, a **Tutor** button appears at the top to switch views.
- **Decline:** the student sees the message on their Apply tab and gets a notification. They can apply again later.
- **Auto-decline** (switch in [[Settings]]): applications where no mark reaches the minimum are declined automatically after a day, with a standard note.
- Templates are managed in **Settings → Response templates**: add, edit, remove, and mark each one as for approving or for declining.

## Rules
- A decided application can't be reopened or changed.
- The database only lets an application be approved through this screen, so no one can make a tutor by editing a record directly.

## Why it's here
Nobody gets a silent decline, and templates keep the wording consistent and kind.

Related: [[Applications]], [[Tutor view switch]], [[Push notifications]]
