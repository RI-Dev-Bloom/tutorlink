---
status: v1
---

# Messaging

**In short:** two-way threads between tutors, lecturers and admin. Every message has a topic.

## Who can message whom
| | Tutor | Lecturer | Admin |
|---|---|---|---|
| **Tutor** | No | Only if they share a module | Yes |
| **Lecturer** | Only if they share a module | No | Yes |
| **Admin** | Yes | Yes | Yes |

Students don't use messaging.

## What it does
- One thread per pair of people.
- It looks like a timeline, not chat bubbles: a line down the left, a dot per message, the topic and how long ago. Tap a message to open the full text.
- Each message is tagged **Lecturer**, **Admin**, **Tutor** or **You**.
- Both sides can reply.

## Why it's here
These are short briefings (venue changes, what to focus on, missing documents), not chats. A timeline lets you scan two months of them at a glance. Making a topic required keeps it scannable.

## Rules
- The "who can message whom" table is enforced by the database. A lecturer can't even *see* a tutor from another module.
- If a lecturer stops teaching a module, they lose access to those tutors' threads.

Related: [[Unread and delivered]], [[Push notifications]]
