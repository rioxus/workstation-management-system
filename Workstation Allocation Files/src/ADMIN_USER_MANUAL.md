# Workstation Allotment Tracker - Admin User Manual

**Version 1.0**  
**Last Updated: January 2026**

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Dashboard Tab](#dashboard-tab)
4. [System Requests Tab](#system-requests-tab)
5. [Allocations Tab](#allocations-tab)
6. [Workstation Data Tab](#workstation-data-tab)
7. [Credentials Tab](#credentials-tab)
8. [Common Questions](#common-questions)

---

## Introduction

Welcome to the Workstation Allotment Tracker! This application helps you manage and assign workstations to employees across your organization. As an Admin, you have full control over the entire system.

This manual will guide you through each feature step-by-step in simple language.

---

## Getting Started

### Logging In

1. Open the application in your web browser
2. You will see a screen with different role options
3. Click on the **"Admin"** button to access the admin dashboard

**[📸 Screenshot needed: Role selection screen showing Admin, Manager, Technical Team, and User options]**

Once you click Admin, you'll see the main admin interface with several tabs towards the left:

- Dashboard
- System Requests
- Allocations
- Workstation Data
- Credentials

---

## Dashboard Tab

The Dashboard is your home screen. It gives you a quick overview of the entire workstation system at a glance.

**[📸 Screenshot needed: Full Dashboard tab view]**

### What You'll See on the Dashboard

#### 1. Quick Summary Cards (Top of the page)

You'll see several boxes showing important numbers:

- **Total Workstations**: The complete number of workstation seats available in your entire organization
- **Occupied**: How many seats are currently in use by employees
- **Available**: How many seats are empty and ready to be assigned
- **Pending Requests**: How many new requests from managers are waiting for your review

**[📸 Screenshot needed: The four summary cards at the top]**

These numbers update automatically whenever you approve or reject requests or make changes to the workstation data.

#### 2. Division Breakdown Across All Locations

You'll see division cards showing each department's total seat count across all locations.

**[📸 Screenshot needed: Division breakdown cards showing division names and totals]**

- **Division Name**: The department name (Engineering, HR, Sales, etc.)
- **Total Seats**: Total workstation seats this division has across ALL locations
- **Click on a division card** to expand and see detailed breakdown by Office, Floor, Lab, and Booked Seats

**Important:** This shows live data - current assignments, not pending requests.

**[📸 Screenshot needed: Division card expanded showing detailed breakdown]**

#### 3. Workstation Allocations Visualization

Below the division cards, you'll see office cards showing seat occupancy grids for each location.

**[📸 Screenshot needed: Workstation allocation visualization showing office cards with floor/lab breakdowns]**

**Grid Colors:**

- **Colored squares**: Assigned seats (each division has its own color)
- **Gray "A" squares**: Available empty seats
- **"B"**: Booked seat (Asset ID not yet visible)
- **Asset ID numbers**: Assigned seats with visible Asset IDs

Click the expand arrow on office cards to see details. Use this to decide where to allocate new requests.

---

## System Requests Tab

This tab is where all workstation requests from managers appear. This is your main workspace for reviewing and processing requests.

**[📸 Screenshot needed: System Requests tab full view with several requests]**

### How Requests Arrive

When a manager submits a request for workstations for their team, it automatically appears in this tab. You will see it in the requests table immediately.

### Understanding the Requests Table

Each row in the table shows one request with the following information:

**[📸 Screenshot needed: Close-up of a single request row with all columns visible]**

1. **Request #**: A unique number automatically assigned to each request (like REQ-001, REQ-002, etc.)
2. **Requestor**: The manager's name who submitted the request
3. **Division**: Which department needs the workstations
4. **Workstations**: How many seats they are requesting
5. **Location**: Which office they prefer
6. **Floor**: Which floor they prefer
7. **Status**: Shows whether the request is:
   - **Pending** (yellow badge): Waiting for you to review
   - **Approved** (green badge): You have approved and assigned seats
   - **Rejected** (red badge): You have rejected the request
8. **Date**: When the request was submitted
9. **Actions**: Buttons to take action on the request

### Request Actions - What You Can Do

For each request, you have two primary action buttons available:

**[📸 Screenshot needed: Action buttons highlighted - Approve, Reject]**

#### 1. Approve Button (Green Checkmark)

This is the most important button. When you click **Approve**, here's what happens:

**Step-by-Step Process:**

1. **You click the green Approve button** on a pending request
2. **The system automatically redirects you** to the **Allocations Tab**
3. **The request information is already loaded** - you'll see the manager's name, division, and how many seats they need

**Important Note:** Clicking "Approve" doesn't complete the approval! It just starts the allocation process. You still need to:

- Select which lab and seats to assign
- Enter the Asset IDs for those seats
- Save the allocation
- Click "Save & Approve" to finalize

#### 2. Reject Button (Red X)

If you need to deny a request:

1. Click the red **Reject** button
2. A dialog box will appear asking you to provide a reason
3. Type the reason why you're rejecting the request (this helps the manager understand)
4. Click **Confirm Rejection**
5. The request status changes to "Rejected" and the request will be updated in the manager's Dashboard

**[📸 Screenshot needed: Rejection dialog with reason text box]**

### Viewing Request Details After Processing

Once you have approved or rejected a request, an additional option becomes available:

#### View Details (Eye Icon)

After you've taken action on a request (approved or rejected it), you can click the **Eye icon** to review the complete details:

**[📸 Screenshot needed: Request details dialog box showing completed request information]**

**Why This Is Useful:**

- Review past decisions
- Check what was allocated for approved requests
- See rejection reasons you provided
- Verify request details for record-keeping
- Reference information when discussing with managers

### Download Requests Feature

At the top of the System Requests tab, you'll see a **"Download All Requests"** button.

**[📸 Screenshot needed: Download button highlighted]**

**What It Does:**

When you click this button:

- The system creates a spreadsheet file (Excel format)
- It includes ALL requests in the system - pending, approved, and rejected

**What's Included in the Download:**

- Request numbers
- Requestor names
- Divisions
- Number of workstations
- Locations and floors
- Status (Pending/Approved/Rejected)
- Dates
- Any notes you added during approval or rejection

This is useful for:

- Keeping records
- Monthly reports
- Sharing information with management
- Analysis and planning

---

## Allocations Tab

This tab is where you actually assign specific workstations to approved requests. You'll come here either by:

1. Clicking the **Approve** button in System Requests (automatic redirect)
2. Clicking the **Allocations** tab directly to manage existing allocations

**[📸 Screenshot needed: Allocations tab initial view]**

### Understanding the Allocations Process

The allocation process has several steps. Let's go through them one by one.

### Step 1: Request Information Display

At the top of the page, you'll see a blue information box showing:

**[📸 Screenshot needed: Request details header in Allocations tab]**

- **Requestor Name**: The manager who made the request
- **Division**: Which department
- **Workstations Needed**: Total number of seats requested
- **Status**: Current status of the request
- **Requested Date**: When they need the workstations

### Step 2: Selecting Location, Floor, and Lab

Below the request information, you'll see dropdown menus to choose where to allocate seats:

**[📸 Screenshot needed: Location, Floor, Lab dropdown selectors]**

**Follow these steps:**

1. **Select Office**: Click the first dropdown and choose which office building

2. **Select Floor**: Click the second dropdown and choose which floor
   - This dropdown activates after you select an office
   - Shows only floors in the office you selected

3. **Select Lab**: Click the third dropdown and choose which lab room
   - This dropdown activates after you select a floor
   - Shows only labs on the floor you selected
   - Each lab name may show how many seats it has (like "Computer Lab A (50 seats)")

**Why This Matters:**

You need to select these because workstations are organized by:

- Office building → Floor level → Lab room → Individual seats

The system needs to know exactly where you're assigning the seats.

### Step 2.5: Understanding Lab Information and Real-Time Availability

#### Lab Dropdown with Dynamic Seat Availability

When you click the **Lab** dropdown, each lab shows real-time availability: `Lab Name (Available: X)`

**[📸 Screenshot needed: Lab dropdown showing labs with availability counts]**

**Calculation:** `Available = Total Capacity - Booked Seats - Pending Seats`

**Key Points:**

- Updates immediately when you save/delete/approve allocations
- Includes pending seats from ALL requests (prevents over-allocation)
- Matches the count in lab summary and Division Utilization table
- If "(Available: 0)", you cannot allocate in that lab

#### Lab Summary Information Line

After selecting a lab, you'll see: `Floor - Lab Name — Capacity: X | Booked: X | Pending: X | Available: X`

**[📸 Screenshot needed: Lab summary line]**

**What Each Number Means:**

1. **Capacity**: Total workstations in this lab
2. **Booked**: Seats assigned to divisions (colored squares in grid)
3. **Pending**: Seats in pending allocations from all requests (yellow "P" in grid)
4. **Available**: Seats you can allocate now (gray "A" in grid)

Check "Available" before allocating to know how many seats you can assign.

#### Division Utilization Table

Below the lab summary line, you'll see the **Division Utilization** table showing how capacity is distributed.

**[📸 Screenshot needed: Division Utilization table with columns and data]**

**Table Columns:**

1. **Division**: Name of the division/department
2. **Seats Available**: Lab-wide available seats (shared pool)
3. **Seats Assigned**: Seats currently assigned to this division
4. **Color**: Visual color indicator for this division in the grid

**Real-Time Updates:**

- Save allocation → Available decreases immediately
- Delete allocation → Available increases
- Approve request → Pending converts to booked, division's "Seats Assigned" increases
- **Consistency**: Lab dropdown, summary line, and table always match

Always check "Seats Available" to know your allocation capacity.

### Step 3: Viewing the Workstation Grid

After selecting a lab, you'll see a visual grid showing all the seats in that lab.

**[📸 Screenshot needed: Workstation grid with some seats selected]**

**Understanding the Grid:**

Each square represents one seat. The squares have different colors and states:

- **Colored squares**: Already assigned to a division - each division has its own unique color - you cannot select these
- **Yellow/Amber squares with "P"**: Pending allocations (saved but not approved) - locked from selection
- **Gray squares with "A"**: Available empty seats - you can click to select these
- **Green squares**: Seats you've currently selected in this session

**What Each Grid Element Means:**

1. **Colored squares (division colors):**
   - Seats officially assigned to divisions (approved requests)
   - May show Asset ID number if assigned
   - Shows "B" if booked but Asset ID not yet visible
   - Cannot be selected or modified from Allocations tab

2. **Yellow/Amber "P" squares:**
   - Pending allocations waiting for approval
   - Includes seats you've saved but not approved
   - Includes seats other admins have saved for other requests
   - Locked to prevent conflicts - you cannot select these
   - These count toward the "Pending" number in the lab summary
   - Will turn to division color after approval

3. **Gray "A" squares:**
   - Available, unassigned seats
   - These are the ONLY seats you can select
   - Count matches the "Available" number in lab summary
   - Click to select for your current allocation

**How to Select Seats:**

1. **Click on any gray square** to select it for this allocation
2. The square will turn **green** to show it's selected
3. **Click again** on a green square to deselect it
4. The counter at the top shows: "Selected: X seats" where X is how many you've clicked

**Important Selection Rules:**

- You can only select **gray "A" seats** (available seats)
- You **cannot** select:
  - Colored squares (already assigned to divisions)
  - Yellow "P" squares (pending allocations)
  - Any seat that is not gray with "A"
- Try to select the **exact number** of seats requested (or fewer if needed)
- The grid is **view-only** for visualization - seat selection happens through clicking available seats
- Pending seats from ALL requests are visible to prevent allocation conflicts

### Step 4: Entering Asset IDs

After selecting seats, you need to assign Asset ID numbers to those seats. This is a **critical step** and only Admins can do this.

**[📸 Screenshot needed: Asset ID Range input field]**

**What Are Asset IDs?**

Asset IDs are unique identification numbers that will be placed at these workstations. Every seat needs an Asset ID.

**Where to Enter Asset IDs:**

Below the grid, you'll see a text box labeled "Asset ID Range"

**How to Enter Asset IDs:**

You have two ways to enter Asset IDs:

**Method 1: Range Format (for consecutive numbers)**

If you have Asset IDs that are in sequence, use this format:

```
240-245
```

This means: Asset IDs from WKS/240 to WKS/245 (that's 6 asset IDs total)

**Method 2: List Format (for individual numbers)**

If the Asset IDs are not in sequence, list them separated by commas:

```
240,242,245,250
```

**Method 3: Mixed Format**

You can also combine ranges and individual IDs:

```
240-243,250,255-257
```

**Critical Rule - Asset ID Count Must Match Seat Count:**

⚠️ **Very Important:** The number of Asset IDs you enter **must exactly match** the number of seats you selected.

**Example:**

- If you selected **5 seats** from the grid
- You must provide **exactly 5 Asset IDs**
- If you provide 4 Asset IDs → Error (too few)
- If you provide 6 Asset IDs → Error (too many)

### Step 5: Saving Your Allocation

After selecting seats and entering Asset IDs, you have two options:

**[📸 Screenshot needed: Save and Save & Approve buttons]**

#### Option 1: Save (Blue Button)

Click the **"Save"** button if you want to:

- Save your work temporarily
- Come back later to add more allocations
- Not finalize the approval yet

**What happens when you click Save:**

1. The system saves this allocation (seats + Asset IDs)
2. The seats show as "saved but not approved" (gray with red border)
3. The request **stays in "Pending" status**
4. You can add more allocations to this same request
5. You can edit or delete this saved allocation later

**When to use Save:**

- The manager requested 10 seats, but you can only allocate 5 right now - save these 5, and come back later to allocate the remaining 5
- You want to review the allocation before final approval
- You're not ready to complete the allocation yet

#### Option 2: Save & Approve (Green Button)

Click the **"Save & Approve"** button when you're ready to:

- Finalize all allocations for this request
- Complete the approval process
- Update the system to reflect these seats as assigned

**What happens when you click Save & Approve:**

1. The system saves this allocation (if you haven't saved it yet)
2. **Checks if you've allocated enough seats** for the request
3. If everything is correct:
   - Changes the request status to **"Approved"**
   - Updates the workstation data
   - The seats turn to the **division's color** in the grid and display the Asset IDs
   - The manager can now see their approved allocation
   - The Dashboard updates to show these seats as "Occupied"
4. You return to the System Requests tab

**When to use Save & Approve:**

- You've allocated all the seats requested
- Everything is correct and final
- You want to complete this request

### Step 6: Viewing Saved Allocations

If you've saved allocations (but not approved yet), you'll see them listed below the grid.

**[📸 Screenshot needed: Saved allocations list with Edit and Delete buttons]**

**What's Shown:**

Each saved allocation displays:

- **Office, Floor, Lab**: Where the seats are located
- **Number of Seats**: How many seats in this allocation
- **Asset IDs**: The Asset IDs you assigned
- **Action Buttons**: Edit and Delete options

**Managing Saved Allocations:**

**Edit Button (Pencil Icon):**

- Click to modify this allocation
- The grid and Asset ID field will reload with this allocation's data
- Change the seat selection or Asset IDs as needed
- Click Save again to update

**Delete Button (Trash Icon):**

- Click to remove this allocation completely
- Confirms before deleting
- The seats become available again (turn gray)
- Use this if you made a mistake or need to start over

### Understanding the Partial Allocations System

The Partial Allocations System is a powerful feature that allows you to allocate seats in stages when you cannot fulfill an entire request at once. This is one of the most important features in the Allocations tab.

**[📸 Screenshot needed: Partial allocation in progress showing saved allocations and progress tracker]**

#### What Is a Partial Allocation?

A partial allocation means you're allocating **fewer seats than requested** and saving them for later completion.

**Example Situation:**

- Manager requests: **15 seats**
- Currently available: **Only 8 seats**
- Solution: Allocate the 8 available seats now, and allocate the remaining 7 seats later when space becomes available

#### How the Partial Allocations System Works

**Step-by-Step Process:**

1. **First Allocation (Partial):**
   - Manager requests 15 seats
   - You find a lab with 8 available seats
   - Select those 8 seats
   - Enter 8 Asset IDs
   - Click **"Save"** (NOT "Save & Approve")
   - Progress shows: "8 / 15 seats allocated" in RED (incomplete)

2. **System Behavior:**
   - The 8 seats are marked as "saved but not approved" (gray with red border)
   - The request **stays in "Pending" status**
   - You can continue working on other requests
   - You can come back anytime to complete this allocation

3. **Second Allocation (Completing):**
   - Later, you return to this request
   - You find another lab with 7 available seats
   - Select those 7 seats
   - Enter 7 Asset IDs
   - Click **"Save"** to add this allocation
   - Progress now shows: "15 / 15 seats allocated" in GREEN (complete)

4. **Final Approval:**
   - Now that you've allocated all 15 seats (8 + 7)
   - Click **"Save & Approve"**
   - The request status changes to "Approved"
   - All 15 seats are finalized and assigned to the division

#### Key Features of the Partial Allocations System

**1. Multiple Allocations Per Request:**

- You can save as many partial allocations as needed for a single request
- Example: 15 seats requested = 5 seats from Lab A + 4 seats from Lab B + 6 seats from Lab C
- Each allocation is saved separately and displayed in the "Saved Allocations" list

**2. Progress Tracking:**

- The Allocation Progress Tracker shows exactly how many seats you've allocated vs. requested
- **Red color**: More seats needed (can't approve yet)
- **Green color**: Enough seats allocated (can approve now)

**3. Flexible Workflow:**

- You're NOT required to allocate all seats at once
- You can pause and resume allocation work anytime
- Other admins can see and continue your saved allocations

**4. Edit and Delete Saved Allocations:**

- Before final approval, you can modify any saved allocation
- Click "Edit" to change seat selection or Asset IDs
- Click "Delete" to remove an allocation and start over

**5. Save & Approve Validation:**

- The system **prevents** you from clicking "Save & Approve" until you've allocated enough seats
- If you've allocated 8 out of 15 seats, "Save & Approve" will show an error
- You must allocate at least the requested number (or all available if fewer exist)

#### When to Use Partial Allocations

**Common Scenarios:**

**Scenario 1: Not Enough Space in One Lab**

- Request: 20 seats
- Lab A has: 12 empty seats
- Lab B has: 8 empty seats
- Solution: Save 12 from Lab A, then save 8 from Lab B, then approve

**Scenario 2: Waiting for Space to Become Available**

- Request: 10 seats
- Currently available: 6 seats
- Solution: Save 6 seats now, wait for employees to relocate or leave, then allocate remaining 4 seats later

**Scenario 3: Staged Rollout**

- Request: 30 seats for a new team
- Team joining in phases: 15 people now, 15 people next month
- Solution: Allocate and save 15 seats now, keep request pending, allocate 15 more next month, then approve

**Scenario 4: Asset IDs Not Ready**

- Request: 10 seats
- You have space but Asset IDs for equipment haven't been assigned yet
- Solution: Work on other requests first, come back when Asset IDs are ready

#### Important Rules for Partial Allocations

❗ **Rule 1: Cannot Approve Without Meeting Request**

- If 15 seats are requested, you must allocate at least 15 before "Save & Approve" will work
- Exception: If the manager agrees to fewer seats, you would need to reject the original request and have them submit a new one

❗ **Rule 2: Saved Allocations Are Temporary**

- "Saved but not approved" allocations are NOT final
- They reserve the seats visually (gray with red border) but don't officially assign them
- Until you click "Save & Approve", managers won't see these allocations

❗ **Rule 3: Other Admins Can See Your Saved Allocations**

- If you save allocations and log out, another admin can see them
- They can continue your work, edit, or delete them
- Communicate with your team about in-progress allocations

❗ **Rule 4: Saved Allocations Don't Block Other Admins**

- Other admins can still work on different requests
- Your saved allocations are specific to one request only

#### Visual Indicators for Partial Allocations

**In the Workstation Grid:**

- **Gray with red border**: Seats you've saved but not approved for this request
- These seats appear "reserved" but can still be selected or deselected
- Once you click "Save & Approve", they turn to the division's color

**In the Saved Allocations List:**

- Shows all your partial allocations with details
- Location (Office, Floor, Lab)
- Number of seats
- Asset IDs assigned
- Edit and Delete buttons

**In the Progress Tracker:**

- **Red text** (e.g., "8 / 15"): Incomplete - more seats needed
- **Green text** (e.g., "15 / 15"): Complete - ready to approve

**In System Requests Tab:**

- Request remains with **yellow "Pending" badge** until you click "Save & Approve"
- Even if you've saved allocations, status stays "Pending"

#### Tips for Using Partial Allocations

- Plan before starting: Check Dashboard to see where empty seats are located
- Review saved allocations before clicking "Save & Approve"
- Use Edit to fix mistakes in saved allocations
- Delete if you allocated in the wrong lab - seats become available immediately
- Communicate with other admins if working on large allocations

#### Difference: Save vs. Save & Approve

- You can then allocate in the correct lab

#### Difference: Save vs. Save & Approve (Detailed)

| Aspect                 | **Save**                                      | **Save & Approve**                                 |
| ---------------------- | --------------------------------------------- | -------------------------------------------------- |
| **Purpose**            | Temporary save, continue later                | Finalize and complete the request                  |
| **Request Status**     | Stays "Pending"                               | Changes to "Approved"                              |
| **Seats in Grid**      | Gray with red border (saved but not approved) | Division's color (officially assigned)             |
| **Manager Visibility** | Manager does NOT see these seats yet          | Manager can see all allocated seats                |
| **Can Edit Later?**    | Yes, click "Edit" anytime                     | No, would need to go to Workstation Data to modify |
| **Progress Tracker**   | Shows partial progress (may be red)           | Only works when progress is complete (green)       |
| **Use Case**           | Partial allocation, need more seats           | All seats allocated, ready to finalize             |

### Common Allocation Scenarios

#### Scenario 1: Simple Allocation (All Seats in One Lab)

Manager requests 5 seats:

1. Click Approve in System Requests
2. Select Office → Floor → Lab
3. Click 5 empty (gray) seats in the grid
4. Enter 5 Asset IDs (e.g., "WKS/100-104")
5. Click **"Save & Approve"**
6. Done! Request is approved.

#### Scenario 2: Split Allocation (Seats Across Multiple Labs)

Manager requests 10 seats, but no single lab has 10 empty seats:

1. Click Approve in System Requests
2. Select Office → Floor → Lab 1
3. Select 6 empty seats
4. Enter 6 Asset IDs (e.g., "WKS/100-105")
5. Click **"Save"** (not Save & Approve yet)
6. Select Office → Floor → Lab 2
7. Select 4 empty seats
8. Enter 4 Asset IDs (e.g., "WKS/200-203")
9. Now you have 10 total seats (6 + 4)
10. Click **"Save & Approve"**
11. Done! Both allocations are approved.

#### Scenario 3: Partial Allocation (Not Enough Seats Right Now)

Manager requests 10 seats, but only 6 are available:

1. Click Approve in System Requests
2. Allocate 6 seats as usual
3. Click **"Save"** (not Save & Approve)
4. Explain to the manager that only 6 are available now
5. Come back later when more seats are available
6. Allocate the remaining 4 seats
7. Then click **"Save & Approve"**

### Error Messages - What They Mean and How to Fix

The system has built-in checks to prevent mistakes. You might see these error messages:

**[📸 Screenshot needed: Examples of error messages]**

#### Error 1: "Please select seats that match the Asset ID count"

**What it means:**

- You selected 5 seats from the grid
- But entered only 3 Asset IDs (or 7 Asset IDs)
- The numbers don't match

**How to fix:**

- Count your selected seats (blue squares)
- Count your Asset IDs
- Make them match exactly
- Either add/remove seats OR add/remove Asset IDs

#### Error 2: "Asset IDs already in use in this lab"

**What it means:**

- One or more Asset IDs you entered are already assigned to seats in this same lab
- Asset IDs must be unique within each lab

**Example:**

- Lab A already has Asset ID "WKS/240" assigned to Division Engineering
- You tried to assign "WKS/240" again to Division HR in the same Lab A
- This creates a conflict - the same Asset ID cannot be in two places in the same lab

**How to fix:**

1. Check which Asset IDs are causing the conflict (the error message will tell you)
2. Use different Asset ID numbers
3. Make sure each Asset ID in a lab is unique

**Important Note:** You CAN use the same Asset ID in different labs - just not in the same lab.

#### Error 3: "You've allocated more seats than requested"

**What it means:**

- The manager requested 5 seats
- You've allocated 6 or more seats total
- This is usually not allowed

**How to fix:**

- Review your saved allocations
- Delete extra allocations
- Or adjust the seat count to match the request exactly

#### Error 4: "Please select seats before saving"

**What it means:**

- You didn't select any seats from the grid
- You must select at least one seat

**How to fix:**

- Click on gray squares in the grid to select seats
- Then try saving again

#### Error 5: "Please enter Asset IDs"

**What it means:**

- You left the Asset ID field empty
- Every allocation must have Asset IDs

**How to fix:**

- Enter Asset IDs in the text box
- Make sure the format is correct (e.g., "WKS/100-105")

### Going Back to System Requests

If you need to leave the Allocations tab:

- Click the **"Back to Requests"** button at the top
- OR click the **System Requests** tab
- Your saved (but not approved) allocations will remain saved
- You can come back anytime to continue

**[📸 Screenshot needed: Back to Requests button highlighted]**

---

## Workstation Data Tab

This is the **most important tab** in the entire system. Everything else depends on the data in this tab.

**[📸 Screenshot needed: Workstation Data tab full view]**

### Why This Tab Is Critical

Think of this tab as the **foundation** of your entire workstation tracking system. Here's why:

- **The Dashboard shows data FROM this tab** - Division totals, occupancy rates, available seats all come from here
- **Allocations depend on this data** - When you allocate seats in the Allocations tab, it updates this tab
- **Managers see data FROM this tab** - The workstation grids managers see are based on this data
- **All reports come FROM this tab** - Any reports or downloads use this data

**In simple terms:** If the data here is wrong, everything else will be wrong. Keep this tab accurate and up-to-date!

### The Two Main Sections

The Workstation Data tab has two sections:

1. **Workstation Management** - Manage offices, floors, labs, and seat assignments
2. **Division Management** - Manage the list of divisions (departments)

Let's explore each section.

---

### Section 1: Workstation Management

This section is organized in a hierarchy (like a family tree):

```
Office Buildings
    └── Floors
        └── Labs
            └── Seats (with divisions and Asset IDs)
```

**[📸 Screenshot needed: Workstation Management section showing the hierarchy]**

You'll see expandable cards for each level. Let's go through them:

#### Managing Offices

At the top level, you'll see cards for each office building.

**[📸 Screenshot needed: Office card collapsed and expanded]**

**What You Can Do:**

**Add a New Office:**

1. Click the **"+ Add Office"** button at the top
2. Enter the office name (e.g., "Main Office", "North Branch")
3. Click Save
4. A new office card appears

**Edit an Office Name:**

1. Click the **pencil (Edit) icon** on an office card
2. Change the name
3. Click Save

**Delete an Office:**

1. Click the **trash (Delete) icon** on an office card
2. Confirm deletion
3. **Warning:** This will delete all floors, labs, and seat data inside this office!

**Important Rules:**

- Office names should be clear and unique
- Before deleting, make sure no important data will be lost
- If an office is deleted, you cannot recover the data

#### Managing Floors

Click on an office card to expand it. Inside, you'll see floors.

**[📸 Screenshot needed: Floors inside an office card]**

**What You Can Do:**

**Add a New Floor:**

1. Inside an office card, click **"+ Add Floor"**
2. Enter the floor name (e.g., "Ground Floor", "Floor 1", "2nd Floor")
3. Click Save
4. A new floor card appears under that office

**Edit a Floor Name:**

1. Click the **pencil (Edit) icon** on a floor card
2. Change the name
3. Click Save

**Delete a Floor:**

1. Click the **trash (Delete) icon** on a floor card
2. Confirm deletion
3. **Warning:** This will delete all labs and seat data on this floor!

**Important Rules:**

- Floor names should make sense for that office
- Each floor belongs to one office only
- Deleting a floor deletes everything in it

#### Managing Labs

Click on a floor card to expand it. Inside, you'll see labs (rooms).

**[📸 Screenshot needed: Labs inside a floor card]**

**What You Can Do:**

**Add a New Lab:**

1. Inside a floor card, click **"+ Add Lab"**
2. Fill in the lab details:
   - **Lab Name**: Name of the room (e.g., "Computer Lab A", "Training Room 1")
   - **Total Capacity**: Maximum number of workstation seats in this lab
   - **Asset ID Range**: (Optional) The range of Asset IDs for this lab (e.g., "WKS/100-150")
3. Click Save
4. A new lab card appears under that floor

**Edit a Lab:**

1. Click the **pencil (Edit) icon** on a lab card
2. Change the lab name, capacity, or Asset ID range
3. Click Save

**Delete a Lab:**

1. Click the **trash (Delete) icon** on a lab card
2. Confirm deletion
3. **Warning:** This will delete all seat assignments in this lab!

**Important Rules:**

- Each lab belongs to one floor only
- The "Total Capacity" is the maximum number of seats - make sure it's accurate
- Asset ID Range is optional but helpful for tracking equipment

#### Managing Seat Assignments (Within Labs)

Click on a lab card to expand it. Inside, you'll see the seat assignment details.

**[📸 Screenshot needed: Lab card expanded showing seat assignments table]**

**What You'll See:**

A table showing:

- **Division**: Which department is using these seats
- **Seats In Use**: How many seats this division has in this lab
- **Asset IDs**: The Asset ID numbers assigned to those seats

**What You Can Do:**

**Add Seat Assignments:**

1. Inside a lab card, click **"+ Assign Seats"**
2. Fill in the form:
   - **Division**: Select which department
   - **Number of Seats**: How many seats to assign
   - **Asset IDs**: Enter the Asset IDs for those seats (same format as Allocations tab)
3. Click Save
4. The seats are now assigned to that division

**Edit Seat Assignments:**

1. Click the **pencil (Edit) icon** on a seat assignment row
2. Change the division, number of seats, or Asset IDs
3. Click Save

**Delete Seat Assignments:**

1. Click the **trash (Delete) icon** on a seat assignment row
2. Confirm deletion
3. Those seats become available again

**Important Rules and Restrictions:**

❗ **Critical Restrictions to Prevent Errors:**

1. **Cannot Exceed Lab Capacity:**
   - If a lab has a capacity of 50 seats
   - You cannot assign more than 50 total seats across all divisions
   - Example: If Division A has 30 seats and Division B has 20 seats = 50 total ✓
   - If you try to add 5 more seats → Error! (would be 55 total)

2. **Asset IDs Must Be Unique Within Each Lab:**
   - Each Asset ID can only be used once in a lab
   - Example: If "WKS/240" is already assigned in Lab A, you cannot use "WKS/240" again in Lab A
   - You CAN use "WKS/240" in Lab B (different lab) ✓

3. **Asset ID Count Must Match Seat Count:**
   - If you assign 5 seats, you must provide exactly 5 Asset IDs
   - The system will count your Asset IDs and compare to the seat number
   - Mismatch = Error!

4. **Asset IDs Must Be Within Lab Range (If Set):**
   - If the lab's Asset ID Range is "WKS/100-150"
   - You can only assign Asset IDs between WKS/100 and WKS/150
   - If you try to use "WKS/200" → Error! (outside the range)
   - This rule only applies if you set an Asset ID Range for the lab

**[📸 Screenshot needed: Error message showing capacity exceeded]**

**Why These Restrictions Exist:**

These rules protect your data from becoming incorrect or inconsistent. They ensure:

- You don't overbook labs
- Asset IDs are properly tracked
- No duplicate assignments
- Data stays accurate and reliable

### How Changes Here Affect Other Tabs

When you make changes in Workstation Management:

**Adding Seat Assignments:**

- Dashboard shows increased "Occupied" count
- Division breakdown cards update to show the new assignment
- Workstation grids show those seats in the division's color (occupied)
- Available seats decrease

**Deleting Seat Assignments:**

- Dashboard shows increased "Available" count
- Division breakdown cards remove that entry
- Workstation grids show those seats as gray with "A" (available)
- Managers see more available seats

**Changing Lab Capacity:**

- Total workstation count changes
- May affect your ability to approve new requests if capacity decreases

**Adding New Labs/Floors/Offices:**

- More options appear in the Allocations tab dropdowns
- More locations available for seat assignments

---

### Section 2: Division Management

This section shows a list of all divisions (departments) in your organization.

**[📸 Screenshot needed: Division Management section with list of divisions]**

**What You'll See:**

A table listing all divisions, for example:

- Engineering
- Human Resources
- Sales
- Marketing
- IT Support
- Finance

**What You Can Do:**

**Add a New Division:**

1. Click the **"+ Add Division"** button
2. Enter the division name
3. Click Save
4. The new division appears in the list

**Edit a Division Name:**

1. Click the **pencil (Edit) icon** next to a division
2. Change the name
3. Click Save

**Delete a Division:**

1. Click the **trash (Delete) icon** next to a division
2. Confirm deletion
3. **Warning:** This will remove all seat assignments for this division!

**[📸 Screenshot needed: Add Division button and form]**

**Important Information Icon:**

You'll notice a small information icon (ℹ️) next to the section title. If you hover over it or click it, you'll see:

> "Adding or removing divisions here will automatically update all division dropdowns throughout the application. Divisions will only appear in "Division Totals" visualizations when they have workstations assigned."

**What This Means:**

- Any division you add here will immediately appear in dropdown menus everywhere in the application:
  - When managers submit requests
  - When you assign seats in Allocations
  - In filters on the Dashboard
  - In Workstation Management forms

- Divisions only show up in the Dashboard "Division Totals" table if they actually have seats assigned
  - If you create a new "Legal" division but haven't assigned any seats yet, it won't appear in Division Totals
  - Once you assign seats to "Legal" in Workstation Management, it will appear

**Why Division Management Is Important:**

1. **Consistency:** All users see the same division names
2. **Accuracy:** Prevents typos or variations (like "HR" vs "Human Resources")
3. **Control:** You control which divisions exist in the system
4. **Updates Everywhere:** One change here affects the whole application

**Best Practices:**

- Use clear, official division names
- Standardize naming (don't use abbreviations unless that's your company standard)
- Before deleting, check if that division has active seat assignments
- Keep the list updated as your organization changes

---

## Credentials Tab

The Credentials tab is where you create and manage login accounts for managers who will use the system.

**[📸 Screenshot needed: Credentials tab full view with user list]**

### What This Tab Does

This tab controls:

- **Who can log in as a Manager**
- **Which divisions each manager can access**
- **Manager account information**

**Important:** Regular employees (end users) do not need credentials - only Managers who will submit requests and view dashboards.

### Understanding the User List

You'll see a table with columns:

**[📸 Screenshot needed: Close-up of user list table]**

1. **Employee ID**: The manager's unique ID number
2. **Name**: The manager's full name
3. **Email**: Their email address
4. **Role**: Will show "Manager" for all entries here
5. **Division Access**: Lists which divisions this manager can access
6. **Actions**: Edit and Delete buttons

### Adding a New Manager Account

**[📸 Screenshot needed: Add User button and form]**

**Step-by-Step:**

1. Click the **"+ Add User"** button at the top
2. Fill in the form:
   - **Employee ID**: Enter their unique ID (e.g., "EMP1234")
   - **Name**: Enter their full name (e.g., "John Smith")
   - **Email**: Enter their email address
   - **Role**: Select "Manager" (this should be the default)
   - **Division Access**: This is the most important field!

3. **Setting Division Access:**
   - You'll see a dropdown or multi-select field
   - Click to see all available divisions (from Division Management)
   - **Select ALL divisions this manager should be able to access**
   - You can select multiple divisions
   - Example: If John Smith manages both "Engineering" and "IT Support", select both

4. Click **Save** or **Create User**
5. The new manager account appears in the list

### What Division Access Controls

The divisions you select here determine what the manager can do and see:

**[📸 Screenshot needed: Manager dashboard showing division-based access]**

#### In the Manager's Dashboard:

**What They CAN See:**

- Workstation grids filtered to show only their divisions' seats
- Division breakdown showing only their divisions
- Statistics for their divisions only

**What They CANNOT See:**

- Other divisions' seat assignments
- Other divisions' statistics
- Global data (only admins see everything)

#### When Submitting Requests:

**What They CAN Do:**

- Submit requests for any division they have access to
- The division dropdown when they create a request will show only their accessible divisions

**What They CANNOT Do:**

- Submit requests for divisions they don't have access to

### Editing Manager Accounts

**[📸 Screenshot needed: Edit user form]**

To edit an existing manager account:

1. Click the **pencil (Edit) icon** next to their name
2. Change any information:
   - Update their name, email, or employee ID
   - **Add or remove division access** - this is commonly updated
3. Click Save
4. Changes take effect immediately

**Common Reason to Edit:**

- Manager changes roles and needs access to different divisions
- Manager now manages additional divisions
- Correcting employee ID or email

### Deleting Manager Accounts

To remove a manager's access:

1. Click the **trash (Delete) icon** next to their name
2. Confirm deletion
3. The account is removed

**What Happens:**

- This manager can no longer log in
- Their previous requests remain in the system
- Past allocations are not affected

**When to Delete:**

- Manager leaves the company
- Manager no longer needs system access
- Duplicate account needs to be removed

### Impact on Manager Dashboard

**Everything a manager sees is controlled by the divisions you assign.**

**[📸 Screenshot needed: Side-by-side comparison of Admin view vs Manager view]**

Managers only see data for their assigned divisions:

- Quick stats count only their divisions' seats
- Workstation grids show only their divisions' assignments
- Division breakdown shows only their divisions
- Request form dropdown shows only their divisions

**Why This Matters:**

- Privacy: Managers don't see other departments' data
- Focus: They only see what's relevant
- Security: Prevents accidental requests for wrong divisions

**Best Practices:**

- Only assign divisions the manager actually manages
- Match your organizational structure
  - If a manager oversees 3 departments, give them access to those 3
  - If they only manage 1, give them only 1

3. **Update When Roles Change:**
   - If a manager gets promoted and takes on more divisions, update their access
   - If they transition to a different role, update immediately

4. **Test the Account:**
   - After creating a manager account, log in as that manager to verify they see the correct data

### Multi-Division Managers vs Single-Division Managers

**Single-Division Manager:**

- Division Access: Sales (only one)
- Simple dashboard showing only Sales data
- Easy to manage

**Multi-Division Manager:**

- Division Access: Engineering, IT Support, Marketing (three divisions)
- Dashboard shows combined data from all three
- Can submit requests for any of the three
- More complex view but appropriate for their role

**[📸 Screenshot needed: Examples of single vs multi-division manager views]**

---

## Common Questions

### General Questions

**Q: What's the difference between "Save" and "Save & Approve" in Allocations?**

A:

- **Save**: Saves your work temporarily. The request stays "Pending". Use this when you need to allocate more seats later or review before finalizing.
- **Save & Approve**: Completes the entire process. The request becomes "Approved", seats are finalized, and the manager is notified.

**Q: Can I approve a request without assigning seats?**

A: No. Clicking "Approve" in System Requests takes you to the Allocations tab, where you MUST assign seats and Asset IDs before the approval is complete.

**Q: What happens if I delete a lab that has assigned seats?**

A: The system will warn you. If you proceed, ALL seat assignments in that lab are deleted. This affects the Dashboard and managers will see those seats as no longer assigned. Be very careful!

**Q: Can I assign the same Asset ID to two different divisions?**

A: Not in the same lab. Asset IDs must be unique within each lab. However, you CAN use the same Asset ID in different labs (for example, WKS/100 in Lab A and WKS/100 in Lab B).

### Dashboard Questions

**Q: Why don't I see a division in the "Division Totals" table?**

A: Divisions only appear in Division Totals if they have workstations assigned. If you created a division in Division Management but haven't assigned any seats to them yet, they won't show up.

**Q: The Dashboard shows different numbers than I expected. Why?**

A: The Dashboard pulls data from the Workstation Data tab. Check Workstation Management to see the actual seat assignments. Make sure all allocations are saved and approved.

**Q: What does "Utilization Rate" mean?**

A: It's the percentage of occupied seats out of total available seats. For example, if you have 100 total seats and 75 are occupied, the utilization rate is 75%.

### System Requests Questions

**Q: A manager submitted a request for 10 seats, but I can only allocate 5 right now. What should I do?**

A:

1. In Allocations, assign the 5 available seats
2. Click "Save" (not "Save & Approve")
3. Communicate with the manager about the partial allocation
4. When more seats become available, go back to Allocations and assign the remaining 5
5. Then click "Save & Approve"

**Q: I accidentally approved the wrong request. Can I undo it?**

A: Yes, but you need to:

1. Go to Workstation Data tab
2. Find the seat assignments you created
3. Delete those assignments
4. The seats become available again
5. You can then reject the request or re-allocate correctly

**Q: Can I edit a request after it's been approved?**

A: You cannot edit the original request, but you can:

- Delete the seat assignments in Workstation Data
- Change the allocations
- Add more seats if needed

### Allocations Questions

**Q: I selected 5 seats and entered 5 Asset IDs, but I still get an error. Why?**

A: Check these common issues:

- Make sure the Asset IDs are formatted correctly (e.g., "WKS/100-104" for a range)
- Verify none of the Asset IDs are already in use in this lab
- Ensure the Asset IDs are within the lab's Asset ID range (if one is set)
- Count again - sometimes a comma or dash is misplaced, changing the count

**Q: Can I allocate seats from multiple labs for one request?**

A: Yes! This is common when no single lab has enough space:

1. Allocate some seats from Lab A and click "Save"
2. Allocate more seats from Lab B and click "Save"
3. When the total equals the requested amount, click "Save & Approve"

**Q: What are "saved but not approved" seats?**

A: These are seats you allocated and saved (using the "Save" button) but haven't finalized with "Save & Approve" yet. They show as gray with a red border in the grid. You can still select them or modify the allocation.

### Workstation Data Questions

**Q: What's the best way to organize offices, floors, and labs?**

A: Match your physical building structure:

- Create one office for each physical building
- Create floors exactly as they exist (Ground Floor, Floor 1, etc.)
- Create labs for each actual room or area with workstations
- Use clear, consistent names everyone will recognize

**Q: Can I move seats from one lab to another?**

A: Not directly. You need to:

1. Delete the seat assignment in the original lab
2. Create a new seat assignment in the target lab
3. Update Asset IDs if needed

**Q: I changed a lab's capacity from 50 to 40, but there are already 45 seats assigned. What happens?**

A: The system will show an error and prevent you from reducing the capacity below the currently assigned number. You must first reduce the seat assignments to 40 or below, then you can change the capacity.

**Q: Do I need to fill in the Asset ID Range for every lab?**

A: No, it's optional. However, it's helpful because:

- It validates that you're using correct Asset IDs when allocating
- It helps keep Asset IDs organized
- It prevents accidental use of Asset IDs from other labs

### Credentials Questions

**Q: I added a new division in Division Management. Do I need to update manager credentials?**

A: Only if an existing manager should have access to that new division. Otherwise, new divisions are automatically available when creating new manager accounts.

**Q: Can a manager access ALL divisions?**

A: Yes, if you select all divisions when creating or editing their account. However, this is usually only appropriate for senior managers or department heads who oversee multiple areas.

**Q: What happens if I don't assign any divisions to a manager?**

A: They won't be able to do much! They can log in, but:

- They won't see any data in their dashboard
- They won't be able to submit requests
- Essentially, their account will be useless

Always assign at least one division.

**Q: Can I have two managers with access to the same division?**

A: Yes! Multiple managers can have access to the same division. This is normal if, for example, two managers co-manage the Engineering department.

---

## Tips for Efficient Management

### Daily Workflow

1. **Morning Check:**
   - Open Dashboard to see overview
   - Check System Requests for new pending requests
   - Review any saved (not approved) allocations you need to complete

2. **Processing Requests:**
   - Review new requests in System Requests
   - Check if seats are available (use Dashboard visualization)
   - Approve and allocate OR reject with clear reasons

3. **Data Maintenance:**
   - Keep Workstation Data accurate
   - Update when employees move or leave
   - Regularly review division totals for accuracy

### Best Practices

1. **Always Double-Check Asset IDs:**
   - Asset ID mistakes are common
   - Verify count matches seat count
   - Ensure no duplicates in the same lab

2. **Communicate with Managers:**
   - If you can only partially fulfill a request, let them know
   - Provide clear rejection reasons
   - Keep them updated on timing

3. **Use Descriptive Names:**
   - Clear office names ("North Building" not "NB")
   - Obvious floor names ("Ground Floor" not "GF")
   - Meaningful lab names ("Computer Lab A" not "Lab1")

4. **Regular Audits:**
   - Periodically check if Dashboard numbers make sense
   - Verify Division Totals match your expectations
   - Ensure no ghost allocations or incorrect data

5. **Keep Division Management Clean:**
   - Only create divisions that actually exist
   - Delete outdated divisions (after removing their assignments)
   - Use consistent naming conventions

---

## Need Help?

If you encounter issues not covered in this manual:

1. Check the Dashboard to see if data looks correct
2. Review Workstation Data for accuracy
3. Verify manager credentials are set up properly
4. Look for error messages - they usually tell you exactly what's wrong
5. Contact your system administrator or IT support

---

**End of Admin User Manual**

_This manual is designed to help you confidently manage the Workstation Allotment Tracker. Take your time to familiarize yourself with each tab, and don't hesitate to refer back to this guide whenever needed!_