# TutorLink mobile — flow diagrams

Every block below is a self-contained Mermaid diagram. Copy the code inside any fence into the Mermaid live editor, or leave them here — GitHub, Notion and most Markdown viewers render them as they are.

1. [The whole app at a glance](#1-the-whole-app-at-a-glance)
2. [Getting in](#2-getting-in)
3. [Tutor flow](#3-tutor-flow)
4. [Lecturer flow](#4-lecturer-flow)
5. [Admin — the application queue](#5-admin--the-application-queue)
6. [Admin — tutors, money and messages](#6-admin--tutors-money-and-messages)
7. [A message, end to end](#7-a-message-end-to-end)
8. [What happens to an application](#8-what-happens-to-an-application)
9. [What happens to a session](#9-what-happens-to-a-session)
10. [How navigation actually works](#10-how-navigation-actually-works)

---

## Colour key

The three role colours are the app's own: navy is the tutor, gold is the lecturer, blue is admin — the same three colours the role tags use on every message. A node is coloured by **whose screen or action it is**, so when a tutor diagram turns blue you know the tutor has just handed the job to admin.

Nothing else is allowed to be gold, for the same reason nothing else in the app is: gold has to keep meaning one thing.

```mermaid
flowchart LR
    T["Tutor"]:::tutor ~~~ L["Lecturer"]:::lect ~~~ A["Admin"]:::admin ~~~ S["Shared screen,<br>sheet or system step"]:::sys
    G["Good outcome"]:::good ~~~ W["Waiting on<br>somebody else"]:::wait ~~~ B["Error or refusal"]:::bad ~~~ X["Outside the<br>mobile app"]:::ext

    classDef tutor fill:#E2E8F0,stroke:#0A2342,stroke-width:2px,color:#0A2342
    classDef lect  fill:#F7EBC8,stroke:#A5872F,stroke-width:2px,color:#5C4A16
    classDef admin fill:#D7E9FE,stroke:#2563EB,stroke-width:2px,color:#12379A
    classDef sys   fill:#FFFFFF,stroke:#9AA3AF,stroke-width:1.5px,color:#4B5563
    classDef good  fill:#DCFCE7,stroke:#3FA45B,stroke-width:2px,color:#14532D
    classDef wait  fill:#FFFFFF,stroke:#9AA3AF,stroke-width:2px,stroke-dasharray:6 3,color:#4B5563
    classDef bad   fill:#FEE2E2,stroke:#DC7C7C,stroke-width:2px,color:#991B1B
    classDef ext   fill:#F1F1EE,stroke:#B9B3AC,stroke-width:1.5px,stroke-dasharray:4 3,color:#5B6472
```

---

## 1. The whole app at a glance

Three roles, three completely different apps, joined underneath by the message threads and by admin approving people into the programme. Signing out of any portal drops you back at the role select.

```mermaid
flowchart TD
    START(["App opens"]) --> ROLE{{"Role select"}}

    ROLE -->|"Tutor"| TSIGN["Sign in"]
    ROLE -->|"Lecturer"| LSIGN["Sign in or create account"]
    ROLE -->|"Admin"| ASIGN["Sign in"]

    TSIGN --> TUTORAPP["TUTOR APP<br>Schedule, Sessions, Messages, Pay, Profile"]
    LSIGN -->|"new account"| LMODS["Pick the modules you teach"]
    LMODS --> LECAPP["LECTURER APP<br>Tutors, Messages, Profile"]
    LSIGN -->|"existing account"| LECAPP
    ASIGN --> ADMINAPP["ADMIN APP<br>Overview, Applications, Tutors, Messages, Settings"]

    LECAPP -->|"posts a notice"| THREADS[["Message threads<br>one per tutor"]]
    ADMINAPP -->|"posts a notice"| THREADS
    THREADS -->|"unread badge"| TUTORAPP

    WEB["Student applies on the web portal"] -.->|"lands in the queue"| ADMINAPP
    ADMINAPP -->|"approves an application"| NEW["Tutor account created<br>plus a welcome message"]
    NEW --> TUTORAPP

    class START,ROLE,THREADS sys
    class TSIGN,TUTORAPP tutor
    class LSIGN,LMODS,LECAPP lect
    class ASIGN,ADMINAPP admin
    class NEW good
    class WEB ext

    classDef tutor fill:#E2E8F0,stroke:#0A2342,stroke-width:2px,color:#0A2342
    classDef lect  fill:#F7EBC8,stroke:#A5872F,stroke-width:2px,color:#5C4A16
    classDef admin fill:#D7E9FE,stroke:#2563EB,stroke-width:2px,color:#12379A
    classDef sys   fill:#FFFFFF,stroke:#9AA3AF,stroke-width:1.5px,color:#4B5563
    classDef good  fill:#DCFCE7,stroke:#3FA45B,stroke-width:2px,color:#14532D
    classDef ext   fill:#F1F1EE,stroke:#B9B3AC,stroke-width:1.5px,stroke-dasharray:4 3,color:#5B6472
```

---

## 2. Getting in

The three sign-in routes are deliberately not the same, because the three accounts come into existence in different ways.

```mermaid
flowchart TD
    ROLE{{"Role select"}}

    ROLE -->|"Tutor"| T1["Tutor sign in<br>no self sign-up"]
    T1 --> T2{"Details match<br>an approved tutor?"}
    T2 -->|"no"| TERR["Error toast plus a long buzz"]
    TERR --> T1
    T2 -->|"yes"| TAPP(["Tutor app"])

    ROLE -->|"Lecturer"| L1["Lecturer sign in"]
    L1 -->|"create an account"| L2["Name, email, password"]
    L2 --> L3["Module picker<br>tap the modules you teach"]
    L3 -->|"at least one chosen"| LAPP(["Lecturer app"])
    L1 -->|"existing account"| LAPP

    ROLE -->|"Admin"| A1["Admin sign in<br>accounts issued by the office"]
    A1 --> AAPP(["Admin app"])

    DEMO["Demo controls<br>slider icon in the header"] -.->|"jump to a role"| TAPP
    DEMO -.-> LAPP
    DEMO -.-> AAPP
    DEMO -.->|"reset demo data"| ROLE

    class ROLE sys
    class T1,T2,TAPP tutor
    class L1,L2,L3,LAPP lect
    class A1,AAPP admin
    class TERR bad
    class DEMO demo

    classDef tutor fill:#E2E8F0,stroke:#0A2342,stroke-width:2px,color:#0A2342
    classDef lect  fill:#F7EBC8,stroke:#A5872F,stroke-width:2px,color:#5C4A16
    classDef admin fill:#D7E9FE,stroke:#2563EB,stroke-width:2px,color:#12379A
    classDef sys   fill:#FFFFFF,stroke:#9AA3AF,stroke-width:1.5px,color:#4B5563
    classDef bad   fill:#FEE2E2,stroke:#DC7C7C,stroke-width:2px,color:#991B1B
    classDef demo  fill:#EDE9FE,stroke:#8B5CF6,stroke-width:2px,stroke-dasharray:5 3,color:#5B21B6
```

---

## 3. Tutor flow

Two questions, really: where am I meant to be, and have I been paid. The five tabs are peers — switching between them swaps the screen body, it does not go deeper. Watch where the flow turns blue: that is the tutor waiting on admin.

```mermaid
flowchart TD
    IN(["Tutor signs in"]) --> TABS{{"Tab bar"}}

    TABS --> HOME["SCHEDULE<br>upcoming sessions, month totals"]
    TABS --> SESS["SESSIONS<br>everything logged so far"]
    TABS --> MSG["MESSAGES<br>timeline of notices"]
    TABS --> PAY["PAY<br>approved, pending, projected"]
    TABS --> PROF["PROFILE<br>modules, email, approval date"]

    HOME -.->|"unread banner"| MSG
    HOME -->|"Mark on a live session"| LOGGED
    SESS -->|"Log session button"| SH1["Sheet: date, module, students"]
    SH1 --> LOGGED["Session logged, still pending"]
    SESS -->|"Upload link"| SH2["Sheet: pick module, attach signed register"]
    SH2 --> DOC["Register saved against the module"]

    LOGGED --> WAIT{{"Waits for admin to confirm"}}
    DOC -.->|"the evidence admin checks"| WAIT
    WAIT --> CONF["Confirmed, now counts towards pay"]
    CONF --> PAY

    MSG -->|"tap a notice"| OPEN["Unfolds the full text<br>gold dot clears, badge drops by one"]
    PAY -->|"Export"| CSV["CSV statement downloaded"]
    PROF --> OUT["Sign out"]

    class IN,TABS,HOME,SESS,MSG,PAY,PROF,OPEN,CSV tutor
    class SH1,SH2,DOC,OUT sys
    class LOGGED wait
    class WAIT admin
    class CONF good

    classDef tutor fill:#E2E8F0,stroke:#0A2342,stroke-width:2px,color:#0A2342
    classDef admin fill:#D7E9FE,stroke:#2563EB,stroke-width:2px,color:#12379A
    classDef sys   fill:#FFFFFF,stroke:#9AA3AF,stroke-width:1.5px,color:#4B5563
    classDef good  fill:#DCFCE7,stroke:#3FA45B,stroke-width:2px,color:#14532D
    classDef wait  fill:#FFFFFF,stroke:#9AA3AF,stroke-width:2px,stroke-dasharray:6 3,color:#4B5563
```

---

## 4. Lecturer flow

The modules chosen at registration decide everything this person can see and everyone they can reach. The one navy node is the hand-off: once it is sent, it belongs to the tutor.

```mermaid
flowchart TD
    IN(["Lecturer signs in"]) --> MODS["Modules they teach"]
    MODS --> FILTER{{"Which tutors teach those modules"}}
    FILTER --> TABS{{"Tab bar"}}

    TABS --> DASH["TUTORS<br>module chips, counts, tutor list"]
    TABS --> ALL["MESSAGES<br>every thread, newest first"]
    TABS --> PROF["PROFILE<br>modules taught, tutors per module"]

    DASH -->|"tap a tutor"| THREAD["THREAD screen<br>every notice with that tutor"]
    ALL -->|"tap a message"| THREAD

    THREAD -->|"New message button"| COMPOSE["Sheet: topic and body"]
    COMPOSE -->|"both filled in"| SEND["Appears at the top of the thread"]
    COMPOSE -->|"something empty"| ERR["Toast: add a topic and a message"]
    ERR --> COMPOSE
    SEND --> DELIV["Marked delivered until the tutor opens it"]

    PROF -->|"Edit"| PICK["Module picker"]
    PICK --> FILTER
    PROF --> OUT["Sign out"]

    class IN,MODS,FILTER,TABS,DASH,ALL,PROF,THREAD,PICK lect
    class COMPOSE,OUT sys
    class SEND good
    class ERR bad
    class DELIV tutor

    classDef tutor fill:#E2E8F0,stroke:#0A2342,stroke-width:2px,color:#0A2342
    classDef lect  fill:#F7EBC8,stroke:#A5872F,stroke-width:2px,color:#5C4A16
    classDef sys   fill:#FFFFFF,stroke:#9AA3AF,stroke-width:1.5px,color:#4B5563
    classDef good  fill:#DCFCE7,stroke:#3FA45B,stroke-width:2px,color:#14532D
    classDef bad   fill:#FEE2E2,stroke:#DC7C7C,stroke-width:2px,color:#991B1B
```

---

## 5. Admin — the application queue

The one decision in the whole system that changes somebody's semester. Approving is green because it ends with a new tutor account and a message already sitting in their inbox.

```mermaid
flowchart TD
    OV["OVERVIEW<br>open applications, active tutors, money outstanding"]
    OV --> APPS["APPLICATIONS<br>filter by status, eligibility flag on each"]
    OV -->|"recent application"| DETAIL
    APPS -->|"tap an applicant"| DETAIL["APPLICATION screen<br>marks with bars, applied modules tagged"]

    DETAIL -->|"Mark done"| BG["Background check recorded<br>status moves to under review"]
    BG --> DETAIL
    DETAIL --> RESP{"Template or custom response"}
    RESP -->|"template"| T1["One of four ready-made replies"]
    RESP -->|"custom"| T2["Free text"]
    T1 --> DEC
    T2 --> DEC{{"Approve or decline"}}

    DEC -->|"approve"| CREATE["Tutor account created with the applied modules<br>welcome message dropped into their inbox"]
    DEC -->|"decline"| DECL["Recorded with the response message"]
    CREATE --> APPS
    DECL --> APPS

    class OV,APPS,DETAIL,BG,RESP,DEC admin
    class T1,T2 sys
    class CREATE good
    class DECL bad

    classDef admin fill:#D7E9FE,stroke:#2563EB,stroke-width:2px,color:#12379A
    classDef sys   fill:#FFFFFF,stroke:#9AA3AF,stroke-width:1.5px,color:#4B5563
    classDef good  fill:#DCFCE7,stroke:#3FA45B,stroke-width:2px,color:#14532D
    classDef bad   fill:#FEE2E2,stroke:#DC7C7C,stroke-width:2px,color:#991B1B
```

---

## 6. 

The recurring work: confirm sessions, release money, chase people. The navy node at the end is the only part admin does not control — whether the tutor actually reads it.

```mermaid
flowchart TD
    TABS{{"Tab bar"}}
    TABS --> TUTORS["TUTORS<br>who is owed what"]
    TABS --> MSGS["MESSAGES<br>every thread in the programme"]
    TABS --> SET["SETTINGS<br>rate, minimum mark, templates"]

    TUTORS -->|"tap a tutor"| TD["TUTOR screen<br>sessions, registers, pay summary"]
    TD -->|"Confirm on a pending session"| CONF["Confirmed, now payable"]
    TD -->|"Add session button"| ADD["Sheet: date, module, students<br>confirmed straight away"]
    ADD --> CONF
    CONF --> OWED["Adds to what the tutor is owed"]
    TD -->|"Mark as paid"| PAID["Every confirmed session marked paid"]

    TD -->|"mail icon"| THREAD["THREAD screen with that tutor"]
    MSGS -->|"tap a thread"| THREAD
    MSGS -->|"New message button"| PICK["Sheet: choose a tutor"]
    PICK --> COMPOSE["Sheet: topic and body"]
    THREAD -->|"New message button"| COMPOSE
    COMPOSE --> SENT["Sent, lands unread in the tutor inbox"]

    SET -->|"Rate per session"| RATE["Sheet: new rate"]
    RATE --> RECALC["Every money figure in the app recalculates"]
    SET --> OUT["Sign out"]

    class TABS,TUTORS,MSGS,SET,TD,THREAD admin
    class ADD,PICK,COMPOSE,RATE,OUT sys
    class CONF,OWED,PAID,RECALC good
    class SENT tutor

    classDef tutor fill:#E2E8F0,stroke:#0A2342,stroke-width:2px,color:#0A2342
    classDef admin fill:#D7E9FE,stroke:#2563EB,stroke-width:2px,color:#12379A
    classDef sys   fill:#FFFFFF,stroke:#9AA3AF,stroke-width:1.5px,color:#4B5563
    classDef good  fill:#DCFCE7,stroke:#3FA45B,stroke-width:2px,color:#14532D
```

---

## 7. A message, end to end

This is the feature the whole mobile app was built around. The two tinted columns are the two people — gold for the lecturer, navy for the tutor — with TutorLink between them.

```mermaid
sequenceDiagram
    box rgb(247,235,200) Lecturer side
        actor L as Lecturer
    end
    participant A as TutorLink
    box rgb(220,230,245) Tutor side
        actor T as Tutor
    end

    L->>A: Opens the thread with a tutor
    L->>A: New message - topic plus body
    A-->>A: Stored with sender, role, timestamp, unread flag
    A-->>L: Appears at the top of the thread, tagged You
    A-->>T: Badge on the mail icon and the Messages tab goes up by one

    Note over A,T: Gold dot marks it unread - the only<br>place gold appears in the message list

    T->>A: Opens Messages, taps the notice
    A-->>T: Unfolds the full text and the exact date and time
    A-->>T: Dot turns hollow, badge drops by one
    A-->>L: Delivered tag clears, dot on the tutor row disappears

    Note over L,T: Admin uses exactly the same thread,<br>the tag just reads Admin instead of Lecturer
```

---

## 8. What happens to an application

Starts on the web, finishes on a phone. Every transition here is an admin action, so everything the admin touches is blue.

```mermaid
%%{init: {"themeVariables": {"noteBkgColor": "#FFFFFF", "noteBorderColor": "#9AA3AF", "noteTextColor": "#4B5563"}}}%%
stateDiagram-v2
    [*] --> Pending: student submits on the web portal
    Pending --> UnderReview: admin marks the background check done
    Pending --> Approved: approve with a response message
    Pending --> Rejected: decline with a response message
    UnderReview --> Approved: approve with a response message
    UnderReview --> Rejected: decline with a response message
    Approved --> [*]
    Rejected --> [*]

    note left of Pending
        The eligibility flag is worked out
        automatically - every module applied
        for must be at or above 75 percent
    end note

    note right of Approved
        Creates the tutor account with the
        modules applied for, and sends
        them a welcome message
    end note

    classDef wait  fill:#FFFFFF,stroke:#9AA3AF,stroke-width:2px,stroke-dasharray:6 3,color:#4B5563
    classDef admin fill:#D7E9FE,stroke:#2563EB,stroke-width:2px,color:#12379A
    classDef good  fill:#DCFCE7,stroke:#3FA45B,stroke-width:2px,color:#14532D
    classDef bad   fill:#FEE2E2,stroke:#DC7C7C,stroke-width:2px,color:#991B1B

    class Pending wait
    class UnderReview admin
    class Approved good
    class Rejected bad
```

---

## 9. What happens to a session

The reason a tutor cannot pay themselves — the colour changes hands halfway down.

```mermaid
%%{init: {"themeVariables": {"noteBkgColor": "#FFFFFF", "noteBorderColor": "#9AA3AF", "noteTextColor": "#4B5563"}}}%%
stateDiagram-v2
    [*] --> Scheduled: on the timetable
    Scheduled --> Logged: tutor taps Mark
    [*] --> Logged: tutor logs one that was not scheduled
    [*] --> Confirmed: admin adds it themselves
    Logged --> Confirmed: admin checks it against the signed register
    Confirmed --> Paid: admin marks the tutor paid
    Paid --> [*]

    note right of Logged
        Shows as Pending to the tutor and
        counts as projected, not earned
    end note

    classDef sys   fill:#FFFFFF,stroke:#9AA3AF,stroke-width:1.5px,color:#4B5563
    classDef tutor fill:#E2E8F0,stroke:#0A2342,stroke-width:2px,color:#0A2342
    classDef admin fill:#D7E9FE,stroke:#2563EB,stroke-width:2px,color:#12379A
    classDef good  fill:#DCFCE7,stroke:#3FA45B,stroke-width:2px,color:#14532D

    class Scheduled sys
    class Logged tutor
    class Confirmed admin
    class Paid good
```

---

## 10. How navigation actually works

Three different movements, so the app knows what to animate. This one is deliberately role-neutral — it works exactly the same way in all three portals.

```mermaid
flowchart LR
    subgraph STACK["Screen stack"]
        direction TB
        S1["Role select"] --> S2["App shell with tab bar"]
        S2 --> S3["Detail screen: thread, application, tutor"]
    end

    TAP1["Tap a tab"] -->|"swaps the body in place,<br>scroll position kept"| S2
    TAP2["Tap a row"] -->|"push: slides in from the right,<br>screen behind slides left and dims"| S3
    BACK["Back button, edge swipe,<br>or the Android back gesture"] -->|"pop: reverses it"| S2
    SHEET["Log, upload, compose, edit rate"] -->|"slides up over the screen,<br>drag down to dismiss"| OVER["Bottom sheet"]
    OVER -->|"saved"| S3

    class S1,S2,S3 screen
    class TAP1,TAP2,BACK move
    class SHEET,OVER sheet

    classDef screen fill:#EEF0F3,stroke:#4B5563,stroke-width:1.5px,color:#1F2937
    classDef move   fill:#FFFFFF,stroke:#0A2342,stroke-width:2px,color:#0A2342
    classDef sheet  fill:#FFFFFF,stroke:#0A2342,stroke-width:2px,stroke-dasharray:6 3,color:#0A2342
```
