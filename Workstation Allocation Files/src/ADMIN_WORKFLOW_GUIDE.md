# Admin Workflow Guide

**Workstation Allotment Tracker**

---

## 📋 Table of Contents

1. [Initial System Setup](#initial-system-setup)
2. [Adding Divisions to Labs](#adding-divisions-to-labs)
3. [Managing Manager Requests](#managing-manager-requests)
4. [Understanding Partial Allocations](#understanding-partial-allocations)
5. [Managing User Access](#managing-user-access)

---

## Initial System Setup

### Step 1: Create Your First Office

**Workstation Data Tab → Offices Section**

1. Click "Add Lab Allocation"
2. Enter office name (e.g., "Headquarters", "Branch Office")
3. Enter floor name (e.g., "Ground Floor", "Floor 1", "2nd Floor")
4. Enter lab name (e.g., "Lab A", "West Wing", "Open Area 1")
5. **Assign total workstations** (e.g., 81 workstations)
6. **Provide Asset ID range** (e.g., 1001 to 1081 for 81 workstations)

**Visual Flow:**

```
📍 Office Creation
   ↓
🏢 Office appears in dropdown menus
   ↓
➕ Add Floor
   ↓
🏗️ Floor available for labs
   ↓
🔢 Assign total workstations (81)
   ↓
🔢 Define Asset ID Range (1001-1081)
   ↓
🧮 System calculates: 81 total seats
   ↓
✅ Lab created with 81 workstations with Asset ID Range (1001-1081)
```

**Example Asset ID Ranges:**

| Lab Name | Asset ID Start | Asset ID End | Total Seats |
| -------- | -------------- | ------------ | ----------- |
| Lab A    | 1001           | 1081         | 81          |
| Lab B    | 1082           | 1162         | 81          |
| Lab C    | 2001           | 2040         | 40          |

---

## Adding Divisions to Labs

### Step 2: Adding Divisions to Labs

**Workstation Data Tab → Click "Add Divisions to Lab"**

1. **Select Location:**
   - Choose Office
   - Choose Floor
   - Choose Lab

2. **Add Division:**
   - Click "Add Division to Lab"
   - Select division name from dropdown (e.g., "Engineering")
   - Enter seats to be allocated from the total seat capacity
   - Enter Asset ID range or individual Asset IDs as required
   - Click Save

3. **Capacity Validation:**
   - Your assigned capacity cannot exceed available seats
   - Multiple divisions can share one lab
   - No Asset ID can exist multiple times across each lab
   - The admin is required to assign Asset IDs during the time of seat allocations for divisions

**Visual Example:**

```
Lab A (Total: 81 seats)
  ├── Engineering: 40 seats
  ├── HR: 20 seats
  └── Sales: 21 seats
  ─────────────────────
  Total Assigned: 81 seats ✅
```

### Division Capacity Rules

**Rule 1: Cannot Exceed Lab Capacity**

```
❌ Wrong:
Lab A: 81 total seats
  Engineering: 50 seats
  HR: 40 seats
  Total: 90 seats → EXCEEDS CAPACITY

✅ Correct:
Lab A: 81 total seats
  Engineering: 50 seats
  HR: 31 seats
  Total: 81 seats → PERFECT
```

**Rule 2: One Division Can Have Multiple Labs**

```
Engineering Division Total: 120 seats
  ├── Office A → Floor 1 → Lab A: 40 seats
  ├── Office A → Floor 2 → Lab B: 40 seats
  └── Office B → Floor 1 → Lab C: 40 seats
```

---

## Managing Manager Requests

### When a Request Arrives

**Notification Flow:**

```
Manager Submits Request
  ↓
📬 Request appears in System Requests Tab
  ↓
🔔 Pending count increases on Dashboard
  ↓
👨‍💼 Admin reviews request
```

### Request Review Process

**System Requests Tab Workflow:**

```
1. VIEW REQUEST
   ↓
2. CHECK DETAILS
   - Employee name
   - Division
   - Preferred Location
   - Number of seats needed
   ↓
3. VERIFY SEAT AVAILABILITY FROM THE GRID
   - Check available seats in requested location
   - Check division's allocated capacity
   ↓
4. MAKE DECISION
   ├─→ APPROVE (Full or Partial)
   └─→ REJECT
```

### Actions You Can Take

#### Action 1: Full Approval

**When:** Requested seats are available

```
Request: 5 seats for Engineering in Lab A
Available: 15 seats in Engineering's Lab A allocation

APPROVE FULL REQUEST
  ↓
Select Asset IDs (5 workstations)
  ↓
Confirm Assignment
  ↓
✅ Request Fulfilled
  ↓
Manager Notified
```

#### Action 2: Partial Approval

**When:** Only some seats are available

```
Request: 10 seats for Sales
Available: 6 seats only in a particular lab

OPTIONS:
  A. Approve 6 seats now, assign remaining 4 in another lab
  B. Assign remaining in alternative location
  C. Wait for more capacity

If choosing A:
  ↓
Select "Partial Approval"
  ↓
Assign 6 available Asset IDs
  ↓
Assign remaining 4 seats in alternative location/lab
  ↓
✅ Partial Request Fulfilled
```

#### Action 3: Rejection

**When:** No seats available in lab

```
Reject Request
  ↓
Provide mandatory rejection reason
  ↓
Click Reject
  ↓
❌ Manager notified with reason
```

### Request Details You See

**Information Panel:**

```
┌──────────────────────────────────────────────────────────┐
│ REQUEST DETAILS                                          │
├──────────────────────────────────────────────────────────┤
│ Requestor Name: John Doe                                 │
│ Division: Engineering                                    │
│ Workstations Required: 5                                 │
│ Preferred Location: Commerce House                       │
│ Requested Date of Allocation: Feb 5, 2026                │
│ Submission Date: Feb 6, 2026                             │
│ Status: Pending                                          │
└──────────────────────────────────────────────────────────┘
        ↓
   [Approve] [Partial Allocation] [Reject]
```

---

## Understanding Partial Allocations

### What is a Partial Allocation?

A partial allocation occurs when you assign fewer seats than requested because full capacity isn't available at once, and the request remains open until completely fulfilled.

### How Partial Allocations Work

**Step-by-Step Flow:**

```
1. MANAGER REQUESTS
   "I need 20 seats for my team"
   ↓
2. ADMIN REVIEWS
   "Only 12 seats available in requested lab"
   ↓
3. ADMIN SELECTS "PARTIAL ALLOCATION"
   Chooses to assign what's currently available
   ↓
4. ADMIN ASSIGNS AVAILABLE SEATS
   Selects 12 Asset IDs from available workstations
   ↓
5. REQUEST STATUS UPDATES
   Request marked as "Partial Allocation" (not complete)
   Shows: 12 of 20 seats allocated
   Remaining: 8 seats still pending
   ↓
6. REQUEST STAYS OPEN
   Request remains in System Requests tab with "Partial" status
   Admin can continue allocating remaining seats when capacity 
   becomes available
   ↓
7. FUTURE ALLOCATION
   When capacity opens in same or different lab:
   - Admin returns to same request
   - Assigns remaining 8 seats
   - Request status changes to "Completed"
```

### Key Difference: Partial vs Rejection

**Important Rule:**

```
❌ CANNOT DO: Assign some seats and reject the rest

✅ MUST DO: Assign available seats, keep request open for 
            remaining seats

The system does not allow partial rejection.
Either approve what's available (partial) OR reject the 
entire request.
```

### Partial Allocation Examples

**Example 1: Single Lab, Multiple Allocations**

```
Timeline:
  Week 1: Manager requests 15 seats in Lab A
          Available in Lab A: 10 seats
          Admin action: Partial allocation - assigns 10 seats
          Status: "Partial - 10 of 15 allocated"

  Week 3: 5 more seats become available in Lab A
          Admin action: Returns to same request
          Admin action: Assigns remaining 5 seats
          Status: "Completed - 15 of 15 allocated"
```

**Example 2: Multi-Lab Allocation**

```
Request: 30 seats for Engineering Division
Available in Lab A: 15 seats
Available in Lab B: 20 seats

Admin Workflow:
  Step 1: Partial allocation - Assign 15 seats in Lab A
          Status: "Partial - 15 of 30 allocated"

  Step 2: Continue same request - Assign 15 more seats in Lab B
          Status: "Completed - 30 of 30 allocated"

Result: Request fulfilled across two labs
```

### Communicating Partial Allocations

**No Email Notification for Partial Allocations:**

When you save partial allocations (e.g., 12 out of 20 seats), the system:

- ✅ Changes request status to "Partially Allocated"
- ✅ Shows which lab(s) contain the partial allocation in the System Requests table
- ❌ **Does NOT send email notification to the manager**

The manager will **NOT** receive any notification until the request is **fully approved**.

**Request Status Tracking:**

While seats are being allocated:

```
Status: Partially Allocated
Display: Shows lab name(s) where seats have been allocated
Manager View: Can see status is "Partially Allocated" but 
              receives NO email
Next Steps: Admin continues allocating remaining seats
```

**When Fully Completed (Automatic Email Sent):**

Only when ALL requested seats are allocated and admin clicks "Approve & Complete":

```
Subject: Request Approved - Request #1234

Your workstation allocation request has been approved!

✅ Total Allocated: 20 seats

Allocation Details:
• 12 seats in Commerce House → Floor 2 → Lab A
• 8 seats in Commerce House → Floor 2 → Lab B

Status: Approved
All requested workstations are now assigned and ready for use.
```

**Key Rules:**

- Partial allocations = NO email notification
- Full approval = Email notification sent to manager
- Manager only knows request is complete when they receive the approval email

---

## Managing User Access

### Credentials Tab Overview

The Credentials Tab controls who can access the system and what they can do.

### User Role Types

**ADMIN**

- Full system access
- Manage all tabs
- Approve/reject requests
- Assign workstations

**DIVISIONAL MANAGER**

- Submit seat requests
- View their division's data
- Track request status
- Cannot approve requests

### Adding New Users

**Credentials Tab Workflow:**

```
1. CLICK "Add Employee"
   ↓
2. ENTER DETAILS
   • Employee ID
   • Full Name
   • Email Address
   • Role (Admin/Manager)
   • Division Assignment (Manager)
   ↓
3. SET PASSWORD
   Create user password
   ↓
4. SAVE
   User account created
```

### Modifying User Access

**Changing Roles or Divisions:**

```
Credentials Tab
  ↓
Find user in list
  ↓
Click "Edit"
  ↓
Update:
  • Role
  • Division
  • Email
  • Password
  ↓
Save changes
  ↓
User sees updated access immediately
```

### Removing Users

```
Credentials Tab
  ↓
Find user
  ↓
Click "Delete"
  ↓
Confirm action
  ↓
User loses system access
  ↓
Note: Their assigned workstations remain in system
```

---

## Quick Reference

### Daily Admin Tasks

**Morning Routine:**

```
1. Login → Dashboard
2. Check "Pending Requests" count
3. Review any new requests in System Requests tab
4. Approve/reject urgent requests
5. Check for capacity alerts
```

**Request Processing:**

```
New Request Arrives
  ↓
Review Details (Who, What, Where, How Many)
  ↓
Check Available Capacity
  ↓
Decision:
  ├─→ Full Approval: Assign all requested seats
  ├─→ Partial Approval: Assign available seats, note remainder
  └─→ Rejection: Provide clear reason
  ↓
Update Request Status
  ↓
System Notifies Manager Automatically (only when fully approved)
```

---

## Key Principles to Remember

### 1. Data Hierarchy

```
Office
  └─ Floor
      └─ Lab
          └─ Division
              └─ Workstation
                  └─ Employee
```

### 2. Source of Truth

```
Workstation Data Tab = Master Control
All other tabs reflect this data
```

### 3. Asset ID Logic

```
Asset ID = Physical Workstation Number
Never changes regardless of who sits there
```

### 4. Capacity Management

```
Total Lab Seats ≥ Sum of Division Allocations
Division Allocation ≥ Occupied Seats
```

### 5. Request Flow

```
Manager Requests → Admin Reviews → Admin Decides → 
System Updates → Notifications Sent (only when fully approved)
```

---

*End of Admin Workflow Guide*
