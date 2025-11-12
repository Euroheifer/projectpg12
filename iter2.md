Frontend Website

TCX2004

Iteration 2

Project Brief

Design and implement a website and its corresponding backend system for a shared expense management platform, modeled after Splitwise. The system should allow users to securely register and authenticate, create and manage expense groups, add and track expenses, record payments, and automatically calculate balances among group members.

Website User Stories

Implement the following user stories using only the web application, the user must be able to interact with the system on a modern browser (such as Chrome, Firefox, Safari). The following user stories are the same as the previous iteration:

As a new user, I can sign up, log in, and log out using my email so that I can securely manage my account and expenses.

As a registered user, I can create, view, update, and delete expense groups so that I can organize shared expenses for different contexts.

As a group admin¹, I can add, update, and remove group members so that I can manage group membership and ensure only relevant people are included.

As a group member, I can invite new members to join a group and view the current member list so that I can keep group membership accurate and up to date.

As a group admin, I can view a detailed audit trail of all changes to expenses and balances so that I can ensure transparency and accountability.

As a group member, I can create, update, and delete expenses (that I have entered), specifying details such as amount, date, payer, and cost-sharing breakdown so that I can accurately record and manage shared costs.

As a group admin, I can create, update, and delete expenses within the group so that I can manage shared costs and maintain accurate financial records for all members.

As a group member, I can set up recurring expenses so that I can automatically track regular charges like rent or subscriptions.

As a group member, I can view all expenses in the group so that I can understand shared spending and contributions.

As a group member, I can rely on automatic balance calculations so that I can see who owes what without manual calculations.

The following user stories are new in this iteration:

As an invited group member, I can accept or decline an invitation to join a group so that I can control over which groups I participate in.

As an group member, I can create, update, and delete payments (that I have entered) specifying details such as amount, date, and payee so that I can accurately record and manage payments.

As a group admin, I can create, update, and delete payments within the group so that I can manage payments and maintain accurate financial records for all members.

As a group member who created the expense/payments, I can attach images (like receipts) to expenses/payments so that there is verifiable proof of transactions (spending/payment) whenever needed.

¹Defined as the creator of the expense group.

Page 1

TCX2004

Introduction to Application Development

Iter 2

Non-Functional Requirements

In addition, your web app must satisfy these NFRs.

All monetary amounts must be stored using integer representations, not floating-point types, to ensure accuracy and avoid rounding errors in financial calculations.

The website must be responsive and usable on a desktop or tablet.

All user data must be transmitted securely using HTTPS.

The backend must log all authentication attempts and critical actions for audit purposes.

The application should provide clear error messages and validation feedback to users.

All user actions should complete within 2 seconds under normal load.

Page 2 of 2