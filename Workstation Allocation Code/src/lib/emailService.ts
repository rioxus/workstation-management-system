/**
 * Email Service for Workstation Allotment Tracker
 * Handles automatic email notifications to admins when new requests are submitted
 */

import { db, supabaseUrl, supabaseAnonKey } from "./supabase";

// 🔧 TESTING MODE: Set to true to override all emails to your verified address
// This is useful when testing with Resend's free tier which only allows sending to verified emails
const TESTING_MODE = true;
const TESTING_EMAIL_OVERRIDE =
  "angkik.borthakur@hitechdigital.com";

export interface EmailNotificationData {
  requestorName: string;
  requestorId: string;
  division: string;
  numWorkstations: number;
  location?: string; // Optional for bulk requests
  floor?: string; // Optional for bulk requests
  preferredFloor?: string; // Manager's preferred floor selection
  requestNumber: string;
  adminEmail: string;
  adminName: string;
  hodEmail?: string; // HOD email for manager requests
  isBulkRequest?: boolean; // Flag to identify bulk requests
  remarks?: string; // Manager's remarks/comments
  requestedAllocationDate?: string; // Requested allocation date
}

export interface RequestStatusEmailData {
  requestorName: string;
  requestorEmail: string;
  requestorId: string;
  division: string;
  numWorkstations: number;
  location: string;
  floor: string;
  requestNumber: string;
  labName?: string;
  rejectionReason?: string;
  approvalNotes?: string;
  hodEmail?: string; // HOD email for manager requests
}

export interface PartialAllocationEmailData {
  requestorName: string;
  requestorEmail: string;
  requestorId: string;
  division: string;
  totalRequested: number;
  seatsAllocated: number;
  seatsRejected: number;
  rejectionReason: string;
  requestNumber: string;
  location: string;
  floor: string;
  allocations: {
    labName: string;
    office: string;
    floor: string;
    seats: number[];
    assetIdRange?: string;
  }[];
}

export const emailService = {
  /**
   * Send email notification to admin about new request
   * This would integrate with an email service like SendGrid, Resend, or Supabase's built-in email
   */
  async sendNewRequestNotification(
    requestData: EmailNotificationData,
  ): Promise<void> {
    try {
      console.log('🔔 Attempting to send admin notification email...');
      console.log('Request data:', {
        requestNumber: requestData.requestNumber,
        requestorName: requestData.requestorName,
        division: requestData.division,
        adminEmail: requestData.adminEmail,
      });
      
      // Email template
      const emailSubject = `New Workstation Request - ${requestData.requestNumber}`;
      const emailBody =
        this.generateNewRequestEmailTemplate(requestData);

      if (!supabaseUrl || !supabaseAnonKey) {
        console.error('❌ Supabase credentials not configured!');
        console.error('supabaseUrl:', supabaseUrl ? 'Present' : 'Missing');
        console.error('supabaseAnonKey:', supabaseAnonKey ? 'Present' : 'Missing');
        console.warn(
          "Supabase credentials not configured for email notifications",
        );
        return;
      }

      console.log('✅ Supabase credentials found');
      console.log('📧 Sending email to:', TESTING_MODE ? TESTING_EMAIL_OVERRIDE : requestData.adminEmail);

      // OPTION 1: Using Supabase Edge Function (Recommended)
      // Call Supabase Edge Function to send email
      const endpoint = `${supabaseUrl}/functions/v1/dynamic-task`;
      console.log('📍 Edge Function endpoint:', endpoint);

      const payload = {
        to: TESTING_MODE
          ? TESTING_EMAIL_OVERRIDE
          : requestData.adminEmail,
        subject: emailSubject,
        html: emailBody,
        from: "onboarding@resend.dev", // Resend's test email - always works
      };

      console.log('📦 Email payload:', {
        to: payload.to,
        subject: payload.subject,
        from: payload.from,
        htmlLength: payload.html.length
      });

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('📨 Response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Email notification error response:', errorText);
        console.error("Email notification error:", errorText);
        throw new Error(`Failed to send email notification: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('✅ Email sent successfully!', responseData);

      console.log(
        `✅ Email notification sent to ${requestData.adminEmail} for request ${requestData.requestNumber}`,
      );
    } catch (error) {
      console.error('❌ CRITICAL ERROR sending email notification:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
      // Don't throw error - we don't want email failures to block request submission
      // Just log it for debugging
    }
  },

  /**
   * Send email notification to the primary admin
   * FIXED: Send only ONE email to Angkik Borthakur (Admin) instead of all admins
   */
  async notifyAllAdmins(requestInfo: {
    requestorName: string;
    requestorId: string;
    division: string;
    numWorkstations: number;
    location: string;
    floor: string;
    preferredFloor?: string; // Add preferred floor
    requestNumber: string;
    remarks?: string; // Manager's remarks
    requestedAllocationDate?: string; // Requested allocation date
  }): Promise<void> {
    try {
      // Send email to single primary admin only
      // Email will be sent to angkik.borthakur@hitechdigital.com (testing override)
      // Addressed to "Angkik Borthakur (Admin)"
      await this.sendNewRequestNotification({
        ...requestInfo,
        adminEmail: 'angkik.borthakur@hitechdigital.com',
        adminName: 'Angkik Borthakur (Admin)',
        preferredFloor: requestInfo.preferredFloor,
        requestedAllocationDate: requestInfo.requestedAllocationDate,
      });

      console.log(
        `Email notification sent to primary admin: angkik.borthakur@hitechdigital.com`,
      );
    } catch (error) {
      console.error("Error notifying admin:", error);
    }
  },

  /**
   * Generate HTML email template for new request notification
   */
  generateNewRequestEmailTemplate(
    data: EmailNotificationData,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Workstation Request</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      margin: -30px -30px 20px -30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .badge {
      display: inline-block;
      background-color: #fbbf24;
      color: #78350f;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 8px;
    }
    .info-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 20px 0;
      background-color: #f8fafc;
      border-radius: 8px;
      overflow: hidden;
    }
    .info-table tr {
      border-bottom: 1px solid #e2e8f0;
    }
    .info-table tr:last-child {
      border-bottom: none;
    }
    .info-table td {
      padding: 14px 16px;
    }
    .info-label {
      font-weight: 600;
      color: #64748b;
      width: 180px;
      font-size: 14px;
    }
    .info-value {
      color: #1e293b;
      font-weight: 500;
      text-align: right;
      font-size: 14px;
    }
    .highlight {
      background-color: #fef3c7;
      padding: 16px;
      border-radius: 6px;
      border-left: 4px solid #f59e0b;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 14px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔔 New Workstation Request</h1>
      <div class="badge">PENDING APPROVAL</div>
    </div>
    
    <p>Hi ${data.adminName},</p>
    
    <p>A new workstation allocation request has been submitted and requires your attention.</p>
    
    <div class="highlight">
      <strong>Request Number:</strong> ${data.requestNumber}
    </div>
    
    <table class="info-table">
      <tr>
        <td class="info-label">Requestor:</td>
        <td class="info-value">${data.requestorName}</td>
      </tr>
      <tr>
        <td class="info-label">Employee ID:</td>
        <td class="info-value">${data.requestorId}</td>
      </tr>
      <tr>
        <td class="info-label">Division:</td>
        <td class="info-value">${data.division}</td>
      </tr>
      <tr>
        <td class="info-label">Workstations Requested:</td>
        <td class="info-value">${data.numWorkstations}</td>
      </tr>
      ${
        data.location && data.location !== ''
          ? `
      <tr>
        <td class="info-label">Preferred Location:</td>
        <td class="info-value">${data.location}</td>
      </tr>
      `
          : ""
      }
      ${
        data.floor && data.floor !== ''
          ? `
      <tr>
        <td class="info-label">Floor:</td>
        <td class="info-value">${data.floor}</td>
      </tr>
      `
          : ""
      }
      ${
        (data as any).preferredFloor && (data as any).preferredFloor !== ''
          ? `
      <tr>
        <td class="info-label">Preferred Floor:</td>
        <td class="info-value">${data.preferredFloor}</td>
      </tr>
      `
          : ""
      }
      ${
        (data as any).requestedAllocationDate && (data as any).requestedAllocationDate !== ''
          ? `
      <tr>
        <td class="info-label">📅 Requested Allocation Date:</td>
        <td class="info-value">${new Date((data as any).requestedAllocationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
      </tr>
      `
          : ""
      }
      ${
        data.remarks && data.remarks !== ''
          ? `
      <tr style="background-color: #fef3c7; border-left: 4px solid #f59e0b;">
        <td class="info-label" style="padding: 12px; font-weight: 600; color: #92400e;">⚠️ Manager's Remarks:</td>
        <td class="info-value" style="padding: 12px; color: #92400e; font-weight: 500;">${data.remarks}</td>
      </tr>
      `
          : ""
      }
    </table>
    
    <p>Please log in to the Workstation Allotment Tracker to review and process this request.</p>
    
    <div class="footer">
      <p>This is an automated notification from the Workstation Allotment Tracker.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  },

  /**
   * Generate plain text version of the email (fallback for email clients that don't support HTML)
   */
  generatePlainTextEmail(data: EmailNotificationData): string {
    const remarksSection = data.remarks && data.remarks !== '' 
      ? `\n⚠️ MANAGER'S REMARKS:\n${data.remarks}\n` 
      : '';
    
    return `
NEW WORKSTATION REQUEST - ${data.requestNumber}

Hi ${data.adminName},

A new workstation allocation request has been submitted and requires your attention.

REQUEST DETAILS:
----------------
Request Number: ${data.requestNumber}
Requestor: ${data.requestorName}
Employee ID: ${data.requestorId}
Division: ${data.division}
Workstations Requested: ${data.numWorkstations}
Location: ${data.location}
Floor: ${data.floor}
${remarksSection}
Please log in to the Workstation Allotment Tracker to review and process this request.

---
This is an automated notification from the Workstation Allotment Tracker.
Please do not reply to this email.
    `.trim();
  },

  /**
   * Send approval notification to user
   */
  async sendApprovalNotification(
    requestData: RequestStatusEmailData,
  ): Promise<void> {
    try {
      const emailSubject = `✅ Workstation Request Approved - ${requestData.requestNumber}`;
      const emailBody =
        this.generateApprovalEmailTemplate(requestData);

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn(
          "Supabase credentials not configured for email notifications",
        );
        return;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/dynamic-task`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            to: TESTING_MODE
              ? TESTING_EMAIL_OVERRIDE
              : requestData.requestorEmail,
            subject: emailSubject,
            html: emailBody,
            from: "onboarding@resend.dev", // Resend's test email - always works
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Email notification error:", errorText);
        throw new Error(
          "Failed to send approval email notification",
        );
      }

      console.log(
        `Approval email sent to ${requestData.requestorEmail} for request ${requestData.requestNumber}`,
      );
    } catch (error) {
      console.error("Error sending approval email:", error);
      // Don't throw - email failures shouldn't block approval process
    }
  },

  /**
   * Send rejection notification to user
   */
  async sendRejectionNotification(
    requestData: RequestStatusEmailData,
  ): Promise<void> {
    try {
      const emailSubject = `❌ Workstation Request Rejected - ${requestData.requestNumber}`;
      const emailBody =
        this.generateRejectionEmailTemplate(requestData);

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn(
          "Supabase credentials not configured for email notifications",
        );
        return;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/dynamic-task`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            to: TESTING_MODE
              ? TESTING_EMAIL_OVERRIDE
              : requestData.requestorEmail,
            subject: emailSubject,
            html: emailBody,
            from: "onboarding@resend.dev", // Resend's test email - always works
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Email notification error:", errorText);
        throw new Error(
          "Failed to send rejection email notification",
        );
      }

      console.log(
        `Rejection email sent to ${requestData.requestorEmail} for request ${requestData.requestNumber}`,
      );
    } catch (error) {
      console.error("Error sending rejection email:", error);
      // Don't throw - email failures shouldn't block rejection process
    }
  },

  /**
   * Generate HTML email template for request approval
   */
  generateApprovalEmailTemplate(
    data: RequestStatusEmailData,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Approved</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      margin: -30px -30px 20px -30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .badge {
      display: inline-block;
      background-color: #d1fae5;
      color: #065f46;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 8px;
    }
    .info-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 20px 0;
      background-color: #f8fafc;
      border-radius: 8px;
      overflow: hidden;
    }
    .info-table tr {
      border-bottom: 1px solid #e2e8f0;
    }
    .info-table tr:last-child {
      border-bottom: none;
    }
    .info-table td {
      padding: 14px 16px;
    }
    .info-label {
      font-weight: 600;
      color: #64748b;
      width: 190px;
      font-size: 14px;
    }
    .info-value {
      color: #1e293b;
      font-weight: 500;
      text-align: right;
      font-size: 14px;
    }
    .success-box {
      background-color: #d1fae5;
      padding: 16px;
      border-radius: 6px;
      border-left: 4px solid #10b981;
      margin: 20px 0;
    }
    .notes-box {
      background-color: #fef3c7;
      padding: 16px;
      border-radius: 6px;
      border-left: 4px solid #f59e0b;
      margin: 20px 0;
    }
    .notes-box h3 {
      margin-top: 0;
      color: #92400e;
      font-size: 16px;
    }
    .notes-box p {
      margin: 0;
      color: #78350f;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 14px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Request Approved!</h1>
      <div class="badge">APPROVED</div>
    </div>
    
    <p>Hi ${data.requestorName},</p>
    
    <p>Great news! Your workstation allocation request has been <strong>approved</strong> by the admin team.</p>
    
    <div class="success-box">
      <strong>Request Number:</strong> ${data.requestNumber}
    </div>
    
    <table class="info-table">
      <tr>
        <td class="info-label">Division:</td>
        <td class="info-value">${data.division}</td>
      </tr>
      <tr>
        <td class="info-label">Workstations Approved:</td>
        <td class="info-value">${data.numWorkstations}</td>
      </tr>
      <tr>
        <td class="info-label">Location:</td>
        <td class="info-value">${data.location}</td>
      </tr>
      <tr>
        <td class="info-label">Floor:</td>
        <td class="info-value">${data.floor}</td>
      </tr>
      ${
        data.labName
          ? `
      <tr>
        <td class="info-label">Lab:</td>
        <td class="info-value">${data.labName}</td>
      </tr>
      `
          : ""
      }
    </table>
    
    ${
      data.approvalNotes
        ? `
    <div class="notes-box">
      <h3>📝 Admin Notes</h3>
      <p>${data.approvalNotes}</p>
    </div>
    `
        : ""
    }
    
    <p>Your request has been successfully processed. You can view the status of your request anytime by logging into the Workstation Allotment Tracker.</p>
    
    <div class="footer">
      <p>This is an automated notification from the Workstation Allotment Tracker.</p>
      <p>If you have any questions, please contact your admin team.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  },

  /**
   * Generate HTML email template for request rejection
   */
  generateRejectionEmailTemplate(
    data: RequestStatusEmailData,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Rejected</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      margin: -30px -30px 20px -30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .badge {
      display: inline-block;
      background-color: #fee2e2;
      color: #991b1b;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 8px;
    }
    .info-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 20px 0;
      background-color: #f8fafc;
      border-radius: 8px;
      overflow: hidden;
    }
    .info-table tr {
      border-bottom: 1px solid #e2e8f0;
    }
    .info-table tr:last-child {
      border-bottom: none;
    }
    .info-table td {
      padding: 14px 16px;
    }
    .info-label {
      font-weight: 600;
      color: #64748b;
      width: 200px;
      font-size: 14px;
    }
    .info-value {
      color: #1e293b;
      font-weight: 500;
      text-align: right;
      font-size: 14px;
    }
    .rejection-box {
      background-color: #fee2e2;
      padding: 16px;
      border-radius: 6px;
      border-left: 4px solid #ef4444;
      margin: 20px 0;
    }
    .rejection-box h3 {
      margin-top: 0;
      color: #991b1b;
      font-size: 16px;
    }
    .rejection-box p {
      margin: 0;
      color: #991b1b;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 14px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Request Rejected</h1>
      <div class="badge">REJECTED</div>
    </div>
    
    <p>Hi ${data.requestorName},</p>
    
    <p>We regret to inform you that your workstation allocation request has been <strong>rejected</strong> by the admin team.</p>
    
    <div class="rejection-box">
      <h3>❗ Reason for Rejection</h3>
      <p>${data.rejectionReason || "No reason provided"}</p>
    </div>
    
    <table class="info-table">
      <tr>
        <td class="info-label">Request Number:</td>
        <td class="info-value">${data.requestNumber}</td>
      </tr>
      <tr>
        <td class="info-label">Division:</td>
        <td class="info-value">${data.division}</td>
      </tr>
      <tr>
        <td class="info-label">Workstations Requested:</td>
        <td class="info-value">${data.numWorkstations}</td>
      </tr>
      <tr>
        <td class="info-label">Location:</td>
        <td class="info-value">${data.location}</td>
      </tr>
      <tr>
        <td class="info-label">Floor:</td>
        <td class="info-value">${data.floor}</td>
      </tr>
      ${
        data.labName
          ? `
      <tr>
        <td class="info-label">Lab:</td>
        <td class="info-value">${data.labName}</td>
      </tr>
      `
          : ""
      }
    </table>
    
    <p>If you have any questions about this rejection, please contact your admin team for clarification.</p>
    
    <div class="footer">
      <p>This is an automated notification from the Workstation Allotment Tracker.</p>
      <p>If you have any questions, please contact your admin team.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  },

  /**
   * Send new request notification to HOD
   * Notifies HOD when their manager submits a request
   */
  async sendHODNewRequestNotification(
    requestData: EmailNotificationData,
  ): Promise<void> {
    if (!requestData.hodEmail) {
      console.log('⚠️ No HOD email provided, skipping HOD notification');
      return;
    }

    try {
      console.log('🔔 Attempting to send HOD notification email...');
      console.log('HOD Email:', requestData.hodEmail);
      
      const emailSubject = `New Workstation Request from ${requestData.requestorName} - ${requestData.requestNumber}`;
      const emailBody = this.generateHODNewRequestEmailTemplate(requestData);

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn("Supabase credentials not configured for email notifications");
        return;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/dynamic-task`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            to: TESTING_MODE ? TESTING_EMAIL_OVERRIDE : requestData.hodEmail,
            subject: emailSubject,
            html: emailBody,
            from: "onboarding@resend.dev",
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("HOD email notification error:", errorText);
        throw new Error("Failed to send HOD email notification");
      }

      console.log(`✅ HOD notification sent to ${requestData.hodEmail} for request ${requestData.requestNumber}`);
    } catch (error) {
      console.error("Error sending HOD notification:", error);
      // Don't throw - email failures shouldn't block request submission
    }
  },

  /**
   * Send status update notification to HOD
   * Notifies HOD when their manager's request is approved/rejected
   */
  async sendHODStatusNotification(
    requestData: RequestStatusEmailData,
    status: 'approved' | 'rejected',
  ): Promise<void> {
    if (!requestData.hodEmail) {
      console.log('⚠️ No HOD email provided, skipping HOD status notification');
      return;
    }

    try {
      const emailSubject = status === 'approved'
        ? `✅ Workstation Request Approved for ${requestData.requestorName} - ${requestData.requestNumber}`
        : `❌ Workstation Request Rejected for ${requestData.requestorName} - ${requestData.requestNumber}`;
      
      const emailBody = status === 'approved'
        ? this.generateHODApprovalEmailTemplate(requestData)
        : this.generateHODRejectionEmailTemplate(requestData);

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn("Supabase credentials not configured for email notifications");
        return;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/dynamic-task`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            to: TESTING_MODE ? TESTING_EMAIL_OVERRIDE : requestData.hodEmail,
            subject: emailSubject,
            html: emailBody,
            from: "onboarding@resend.dev",
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error("HOD status email error:", errorText);
        throw new Error("Failed to send HOD status email notification");
      }

      console.log(`✅ HOD ${status} notification sent to ${requestData.hodEmail} for request ${requestData.requestNumber}`);
    } catch (error) {
      console.error("Error sending HOD status notification:", error);
      // Don't throw - email failures shouldn't block approval/rejection process
    }
  },

  /**
   * Generate HTML email template for HOD new request notification
   */
  generateHODNewRequestEmailTemplate(
    data: EmailNotificationData,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Workstation Request</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      margin: -30px -30px 20px -30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .badge {
      display: inline-block;
      background-color: #dbeafe;
      color: #1e40af;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 8px;
    }
    .info-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 20px 0;
      background-color: #f8fafc;
      border-radius: 8px;
      overflow: hidden;
    }
    .info-table tr {
      border-bottom: 1px solid #e2e8f0;
    }
    .info-table tr:last-child {
      border-bottom: none;
    }
    .info-table td {
      padding: 14px 16px;
    }
    .info-label {
      font-weight: 600;
      color: #64748b;
      width: 180px;
      font-size: 14px;
    }
    .info-value {
      color: #1e293b;
      font-weight: 500;
      text-align: right;
      font-size: 14px;
    }
    .highlight {
      background-color: #dbeafe;
      padding: 16px;
      border-radius: 6px;
      border-left: 4px solid #3b82f6;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 14px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📋 New Workstation Request Submitted</h1>
      <div class="badge">FYI - PENDING ADMIN APPROVAL</div>
    </div>
    
    <p>Dear HOD,</p>
    
    <p>This is to inform you that <strong>${data.requestorName}</strong> (${data.requestorId}) from your team has submitted a workstation allocation request.</p>
    
    <div class="highlight">
      <strong>Request Number:</strong> ${data.requestNumber}
    </div>
    
    <table class="info-table">
      <tr>
        <td class="info-label">Manager:</td>
        <td class="info-value">${data.requestorName}</td>
      </tr>
      <tr>
        <td class="info-label">Employee ID:</td>
        <td class="info-value">${data.requestorId}</td>
      </tr>
      <tr>
        <td class="info-label">Division:</td>
        <td class="info-value">${data.division}</td>
      </tr>
      <tr>
        <td class="info-label">Workstations Requested:</td>
        <td class="info-value">${data.numWorkstations}</td>
      </tr>
      ${
        data.location && data.location !== ''
          ? `
      <tr>
        <td class="info-label">Preferred Location:</td>
        <td class="info-value">${data.location}</td>
      </tr>
      `
          : ""
      }
      ${
        data.preferredFloor && data.preferredFloor !== ''
          ? `
      <tr>
        <td class="info-label">Preferred Floor:</td>
        <td class="info-value">${data.preferredFloor}</td>
      </tr>
      `
          : ""
      }
      ${
        data.requestedAllocationDate && data.requestedAllocationDate !== ''
          ? `
      <tr>
        <td class="info-label">📅 Requested Allocation Date:</td>
        <td class="info-value">${new Date(data.requestedAllocationDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
      </tr>
      `
          : ""
      }
      ${
        data.remarks && data.remarks !== ''
          ? `
      <tr style="background-color: #fef3c7; border-left: 4px solid #f59e0b;">
        <td class="info-label" style="padding: 12px; font-weight: 600; color: #92400e;">⚠️ Manager's Remarks:</td>
        <td class="info-value" style="padding: 12px; color: #92400e; font-weight: 500;">${data.remarks}</td>
      </tr>
      `
          : ""
      }
    </table>
    
    <p>The request is currently pending admin approval. You will receive another notification once the admin has reviewed and processed this request.</p>
    
    <div class="footer">
      <p>This is an automated FYI notification from the Workstation Allotment Tracker.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  },

  /**
   * Generate HTML email template for HOD approval notification
   */
  generateHODApprovalEmailTemplate(
    data: RequestStatusEmailData,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Approved</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      margin: -30px -30px 20px -30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .badge {
      display: inline-block;
      background-color: #d1fae5;
      color: #065f46;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 8px;
    }
    .info-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 20px 0;
      background-color: #f8fafc;
      border-radius: 8px;
      overflow: hidden;
    }
    .info-table tr {
      border-bottom: 1px solid #e2e8f0;
    }
    .info-table tr:last-child {
      border-bottom: none;
    }
    .info-table td {
      padding: 14px 16px;
    }
    .info-label {
      font-weight: 600;
      color: #64748b;
      width: 190px;
      font-size: 14px;
    }
    .info-value {
      color: #1e293b;
      font-weight: 500;
      text-align: right;
      font-size: 14px;
    }
    .success-box {
      background-color: #d1fae5;
      padding: 16px;
      border-radius: 6px;
      border-left: 4px solid #10b981;
      margin: 20px 0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 14px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Request Approved</h1>
      <div class="badge">APPROVED</div>
    </div>
    
    <p>Dear HOD,</p>
    
    <p>This is to inform you that the workstation allocation request submitted by <strong>${data.requestorName}</strong> (${data.requestorId}) has been <strong>approved</strong> by the admin team.</p>
    
    <div class="success-box">
      <strong>Request Number:</strong> ${data.requestNumber}
    </div>
    
    <table class="info-table">
      <tr>
        <td class="info-label">Manager:</td>
        <td class="info-value">${data.requestorName}</td>
      </tr>
      <tr>
        <td class="info-label">Division:</td>
        <td class="info-value">${data.division}</td>
      </tr>
      <tr>
        <td class="info-label">Workstations Approved:</td>
        <td class="info-value">${data.numWorkstations}</td>
      </tr>
      <tr>
        <td class="info-label">Location:</td>
        <td class="info-value">${data.location}</td>
      </tr>
      <tr>
        <td class="info-label">Floor:</td>
        <td class="info-value">${data.floor}</td>
      </tr>
      ${
        data.labName
          ? `
      <tr>
        <td class="info-label">Lab:</td>
        <td class="info-value">${data.labName}</td>
      </tr>
      `
          : ""
      }
    </table>
    
    ${
      data.approvalNotes
        ? `
    <div style="background-color: #fef3c7; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0;">
      <h3 style="margin-top: 0; color: #92400e; font-size: 16px;">📝 Admin Notes</h3>
      <p style="margin: 0; color: #78350f;">${data.approvalNotes}</p>
    </div>
    `
        : ""
    }
    
    <p>The manager has been notified of this approval. This is an FYI notification for your records.</p>
    
    <div class="footer">
      <p>This is an automated FYI notification from the Workstation Allotment Tracker.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  },

  /**
   * Generate HTML email template for HOD rejection notification
   */
  generateHODRejectionEmailTemplate(
    data: RequestStatusEmailData,
  ): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Rejected</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      margin: -30px -30px 20px -30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .badge {
      display: inline-block;
      background-color: #fee2e2;
      color: #991b1b;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 8px;
    }
    .info-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 20px 0;
      background-color: #f8fafc;
      border-radius: 8px;
      overflow: hidden;
    }
    .info-table tr {
      border-bottom: 1px solid #e2e8f0;
    }
    .info-table tr:last-child {
      border-bottom: none;
    }
    .info-table td {
      padding: 14px 16px;
    }
    .info-label {
      font-weight: 600;
      color: #64748b;
      width: 200px;
      font-size: 14px;
    }
    .info-value {
      color: #1e293b;
      font-weight: 500;
      text-align: right;
      font-size: 14px;
    }
    .rejection-box {
      background-color: #fee2e2;
      padding: 16px;
      border-radius: 6px;
      border-left: 4px solid #ef4444;
      margin: 20px 0;
    }
    .rejection-box h3 {
      margin-top: 0;
      color: #991b1b;
      font-size: 16px;
    }
    .rejection-box p {
      margin: 0;
      color: #991b1b;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      font-size: 14px;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>❌ Request Rejected</h1>
      <div class="badge">REJECTED</div>
    </div>
    
    <p>Dear HOD,</p>
    
    <p>This is to inform you that the workstation allocation request submitted by <strong>${data.requestorName}</strong> (${data.requestorId}) has been <strong>rejected</strong> by the admin team.</p>
    
    <div class="rejection-box">
      <h3>❗ Reason for Rejection</h3>
      <p>${data.rejectionReason || "No reason provided"}</p>
    </div>
    
    <table class="info-table">
      <tr>
        <td class="info-label">Request Number:</td>
        <td class="info-value">${data.requestNumber}</td>
      </tr>
      <tr>
        <td class="info-label">Manager:</td>
        <td class="info-value">${data.requestorName}</td>
      </tr>
      <tr>
        <td class="info-label">Division:</td>
        <td class="info-value">${data.division}</td>
      </tr>
      <tr>
        <td class="info-label">Workstations Requested:</td>
        <td class="info-value">${data.numWorkstations}</td>
      </tr>
      <tr>
        <td class="info-label">Location:</td>
        <td class="info-value">${data.location}</td>
      </tr>
      <tr>
        <td class="info-label">Floor:</td>
        <td class="info-value">${data.floor}</td>
      </tr>
      ${
        data.labName
          ? `
      <tr>
        <td class="info-label">Lab:</td>
        <td class="info-value">${data.labName}</td>
      </tr>
      `
          : ""
      }
    </table>
    
    <p>The manager has been notified of this rejection. This is an FYI notification for your records.</p>
    
    <div class="footer">
      <p>This is an automated FYI notification from the Workstation Allotment Tracker.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  },

  /**
   * Send partial allocation notification to manager
   * Notifies manager that their request was partially approved
   */
  async sendPartialAllocationNotification(data: PartialAllocationEmailData): Promise<void> {
    try {
      const emailSubject = `🟡 Partial Allocation - Request ${data.requestNumber}`;
      const emailBody = this.generatePartialAllocationEmailTemplate(data);

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase credentials not configured for email notifications');
        return;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/dynamic-task`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            to: TESTING_MODE ? TESTING_EMAIL_OVERRIDE : data.requestorEmail,
            subject: emailSubject,
            html: emailBody,
            from: 'onboarding@resend.dev',
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Partial allocation email error:', errorText);
        throw new Error('Failed to send partial allocation email');
      }

      console.log(`✅ Partial allocation email sent to ${data.requestorEmail}`);
    } catch (error) {
      console.error('Error sending partial allocation email:', error);
      throw error;
    }
  },

  /**
   * Send partial allocation FYI notification to HOD
   */
  async sendHODPartialAllocationNotification(data: PartialAllocationEmailData): Promise<void> {
    if (!data.hodEmail) {
      console.log('⚠️ No HOD email provided, skipping HOD partial allocation notification');
      return;
    }

    try {
      const emailSubject = `🟡 FYI: Partial Allocation for ${data.requestorName} - ${data.requestNumber}`;
      const emailBody = this.generateHODPartialAllocationEmailTemplate(data);

      if (!supabaseUrl || !supabaseAnonKey) {
        console.warn('Supabase credentials not configured for email notifications');
        return;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/dynamic-task`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            to: TESTING_MODE ? TESTING_EMAIL_OVERRIDE : data.hodEmail,
            subject: emailSubject,
            html: emailBody,
            from: 'onboarding@resend.dev',
          }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('HOD partial allocation email error:', errorText);
        throw new Error('Failed to send HOD partial allocation email');
      }

      console.log(`✅ HOD partial allocation email sent to ${data.hodEmail}`);
    } catch (error) {
      console.error('Error sending HOD partial allocation email:', error);
      throw error;
    }
  },

  /**
   * Generate HTML template for partial allocation notification
   */
  generatePartialAllocationEmailTemplate(data: PartialAllocationEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Partial Allocation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      margin: -30px -30px 20px -30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .badge {
      display: inline-block;
      background-color: #fef3c7;
      color: #92400e;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 8px;
    }
    .info-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 20px 0;
      background-color: #f8fafc;
      border-radius: 8px;
      overflow: hidden;
    }
    .info-table tr {
      border-bottom: 1px solid #e2e8f0;
    }
    .info-table tr:last-child {
      border-bottom: none;
    }
    .info-table td {
      padding: 14px 16px;
    }
    .info-label {
      font-weight: 600;
      color: #64748b;
      width: 200px;
      font-size: 14px;
    }
    .info-value {
      color: #1e293b;
      font-weight: 500;
      text-align: right;
      font-size: 14px;
    }
    .warning-box {
      background-color: #fef3c7;
      padding: 16px;
      border-radius: 6px;
      border-left: 4px solid #f59e0b;
      margin: 20px 0;
    }
    .warning-box h3 {
      margin: 0 0 8px 0;
      color: #92400e;
      font-size: 16px;
    }
    .allocation-details {
      background-color: #f0fdf4;
      padding: 16px;
      border-radius: 6px;
      border-left: 4px solid #10b981;
      margin: 20px 0;
    }
    .allocation-details h3 {
      margin: 0 0 12px 0;
      color: #065f46;
      font-size: 16px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class=\"container\">
    <div class=\"header\">
      <h1>🟡 Workstation Request - Partial Allocation</h1>
      <div class=\"badge\">PARTIALLY APPROVED</div>
    </div>
    
    <p>Dear ${data.requestorName},</p>
    
    <p>Your workstation allocation request has been <strong>partially approved</strong>.</p>
    
    <table class=\"info-table\">
      <tr>
        <td class=\"info-label\">Request Number:</td>
        <td class=\"info-value\">${data.requestNumber}</td>
      </tr>
      <tr>
        <td class=\"info-label\">Division:</td>
        <td class=\"info-value\">${data.division}</td>
      </tr>
      <tr>
        <td class=\"info-label\">Total Requested:</td>
        <td class=\"info-value\">${data.totalRequested} workstations</td>
      </tr>
      <tr style=\"background-color: #d1fae5;\">
        <td class=\"info-label\" style=\"color: #065f46;\">✅ Workstations Allocated:</td>
        <td class=\"info-value\" style=\"color: #065f46; font-weight: 700;\">${data.seatsAllocated} workstations</td>
      </tr>
      <tr style=\"background-color: #fee2e2;\">
        <td class=\"info-label\" style=\"color: #991b1b;\">❌ Workstations Not Allocated:</td>
        <td class=\"info-value\" style=\"color: #991b1b; font-weight: 700;\">${data.seatsRejected} workstations</td>
      </tr>
    </table>
    
    <div class=\"warning-box\">
      <h3>⚠️ Reason for Partial Allocation</h3>
      <p>${data.rejectionReason}</p>
    </div>
    
    <div class=\"allocation-details\">
      <h3>📋 Allocated Workstations Details</h3>
      ${data.allocations.map(alloc => `
        <p><strong>${alloc.labName}</strong> (${alloc.office} - ${alloc.floor}): ${alloc.seats.length} workstations</p>
      `).join('')}
    </div>
    
    <p>The manager has been notified of this partial allocation. This is an FYI notification for your records.</p>
    
    <div class=\"footer\">
      <p>This is an automated notification from the Workstation Allotment Tracker.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  },

  /**
   * Generate HTML template for HOD partial allocation FYI notification
   */
  generateHODPartialAllocationEmailTemplate(data: PartialAllocationEmailData): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>FYI: Partial Allocation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      background-color: #f5f5f5;
    }
    .container {
      background-color: #ffffff;
      border-radius: 8px;
      padding: 30px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    .header {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: white;
      padding: 20px;
      border-radius: 8px 8px 0 0;
      margin: -30px -30px 20px -30px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .badge {
      display: inline-block;
      background-color: #fef3c7;
      color: #92400e;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      margin-top: 8px;
    }
    .info-table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin: 20px 0;
      background-color: #f8fafc;
      border-radius: 8px;
      overflow: hidden;
    }
    .info-table tr {
      border-bottom: 1px solid #e2e8f0;
    }
    .info-table tr:last-child {
      border-bottom: none;
    }
    .info-table td {
      padding: 14px 16px;
    }
    .info-label {
      font-weight: 600;
      color: #64748b;
      width: 200px;
      font-size: 14px;
    }
    .info-value {
      color: #1e293b;
      font-weight: 500;
      text-align: right;
      font-size: 14px;
    }
    .warning-box {
      background-color: #fef3c7;
      padding: 16px;
      border-radius: 6px;
      border-left: 4px solid #f59e0b;
      margin: 20px 0;
    }
    .warning-box h3 {
      margin: 0 0 8px 0;
      color: #92400e;
      font-size: 16px;
    }
    .footer {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class=\"container\">
    <div class=\"header\">
      <h1>🟡 FYI: Partial Allocation</h1>
      <div class=\"badge\">INFORMATIONAL</div>
    </div>
    
    <p>Dear HOD,</p>
    
    <p>This is to inform you that the workstation allocation request submitted by <strong>${data.requestorName}</strong> (${data.requestorId}) has been <strong>partially approved</strong> by the admin team.</p>
    
    <table class=\"info-table\">
      <tr>
        <td class=\"info-label\">Request Number:</td>
        <td class=\"info-value\">${data.requestNumber}</td>
      </tr>
      <tr>
        <td class=\"info-label\">Manager:</td>
        <td class=\"info-value\">${data.requestorName}</td>
      </tr>
      <tr>
        <td class=\"info-label\">Division:</td>
        <td class=\"info-value\">${data.division}</td>
      </tr>
      <tr>
        <td class=\"info-label\">Total Requested:</td>
        <td class=\"info-value\">${data.totalRequested} workstations</td>
      </tr>
      <tr style=\"background-color: #d1fae5;\">
        <td class=\"info-label\" style=\"color: #065f46;\">✅ Workstations Allocated:</td>
        <td class=\"info-value\" style=\"color: #065f46; font-weight: 700;\">${data.seatsAllocated} workstations</td>
      </tr>
      <tr style=\"background-color: #fee2e2;\">
        <td class=\"info-label\" style=\"color: #991b1b;\">❌ Workstations Not Allocated:</td>
        <td class=\"info-value\" style=\"color: #991b1b; font-weight: 700;\">${data.seatsRejected} workstations</td>
      </tr>
      <tr>
        <td class=\"info-label\">Location:</td>
        <td class=\"info-value\">${data.location}</td>
      </tr>
      <tr>
        <td class=\"info-label\">Floor:</td>
        <td class=\"info-value\">${data.floor}</td>
      </tr>
    </table>
    
    <div class=\"warning-box\">
      <h3>⚠️ Reason for Partial Allocation</h3>
      <p>${data.rejectionReason}</p>
    </div>
    
    <div class=\"allocation-details\">
      <h3>📋 Allocated Workstations Details</h3>
      ${data.allocations.map(alloc => `\n        <p><strong>${alloc.labName}</strong> (${alloc.office} - ${alloc.floor}): ${alloc.seats.length} workstations</p>\n      `).join('')}
    </div>
    
    <p>The manager has been notified of this partial allocation. This is an FYI notification for your records.</p>
    
    <div class=\"footer\">
      <p>This is an automated FYI notification from the Workstation Allotment Tracker.</p>
      <p>Please do not reply to this email.</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  },
};