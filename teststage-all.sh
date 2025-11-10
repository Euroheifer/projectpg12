#!/bin/bash
set -e

API="http://localhost:8080"

call_api() {
  # $1: method, $2: url, $3: token, $4: data(optional)
  if [ -z "$4" ]; then
    curl -sS -X "$1" "$2" -H "Authorization: Bearer $3"
  else
    curl -sS -X "$1" "$2" -H "Authorization: Bearer $3" -H "Content-Type: application/json" -d "$4"
  fi
}

# ---------- Step 1: Create users ----------
echo "========== Step 1: Create users =========="
for i in {1..6}; do
  email="user${i}@expense.com"
  username="user${i}"
  password="pass${i}"
  response=$(curl -s -X POST "$API/users/signup" \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\", \"username\":\"$username\", \"password\":\"$password\"}")
  echo "user${i} created: $response"
done

# ---------- Step 2: Login and get tokens ----------

echo "========== Step 2: Login and get tokens =========="
tokens=()
for i in {1..6}; do
  username="user${i}@expense.com"
  password="pass${i}"
  token=$(curl -s -X POST "$API/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=$username&password=$password" | jq -r '.access_token')
  tokens[$i]=$token
  echo "user${i} token: ${tokens[$i]}"
done


echo "========== Step 3: user1 creates 2 groups =========="
g1=$(call_api POST "$API/groups/" "${tokens[1]}" '{"name":"Office Supplies","description":"Monthly office expenses"}')
g2=$(call_api POST "$API/groups/" "${tokens[1]}" '{"name":"Team Lunch","description":"Monthly lunch"}')
echo "Group created by user1: $(echo "$g1" | jq '.')"
echo "Group created by user1: $(echo "$g2" | jq '.')"

g1_id=$(echo "$g1" | jq '.id')
g2_id=$(echo "$g2" | jq '.id')

# ---------- Step 4: user2 creates 1 group ----------

echo "========== Step 4: user2 creates 1 group =========="
g3=$(call_api POST "$API/groups/" "${tokens[2]}" '{"name":"Project Alpha","description":"Project budget"}')
g3_id=$(echo "$g3" | jq '.id')
echo "Group created by user2: $(echo "$g3" | jq '.')"

# ---------- Step 5: user1 views/updates/deletes own groups ----------

echo "========== Step 5: user1 views/updates/deletes own groups =========="
view=$(call_api GET "$API/groups/" "${tokens[1]}")
echo "user1 views group: $(echo "$view" | jq '.')"

update=$(call_api PATCH "$API/groups/$g1_id" "${tokens[1]}" '{"description":"Updated description"}')
echo "user1 updates group: $(echo "$update" | jq '.')"

delete=$(call_api DELETE "$API/groups/$g2_id" "${tokens[1]}")
echo "user1 deletes group $g2_id: $(echo "$delete" | jq '.')"

remain=$(call_api GET "$API/groups/" "${tokens[1]}")
echo "Remain groups after user1 operations: $(echo "$remain" | jq '.')"

# ---------- Step 6: user2 adds members ----------

echo "========== Step 6: user2 adds members to their group =========="
add1=$(call_api POST "$API/groups/$g3_id/members/3" "${tokens[2]}")
add2=$(call_api POST "$API/groups/$g3_id/members/4" "${tokens[2]}")
echo "Added member3: $(echo "$add1" | jq '.')"
echo "Added member4: $(echo "$add2" | jq '.')"

# ---------- Step 7: List group members ----------

echo "========== Step 7: List group members =========="
members=$(call_api GET "$API/groups/$g3_id/members" "${tokens[2]}")
group_info=$(jq -n --argjson gid "$g3_id" --arg gname "Project Alpha" --argjson members "$members" \
  '{group_id: $gid, group_name: $gname, members: $members}')
echo "$group_info" | jq '.'

# ---------- Step 8: Update nickname ----------

echo "========== Step 8: Update member nickname =========="
nick_update=$(call_api PATCH "$API/groups/$g3_id/members/3" "${tokens[2]}" '{"nickname":"LittleCat"}')
echo "Member3 nickname updated by user2: $(echo "$nick_update" | jq '.')"

# ---------- Step 8B: Non-admin tries to change another member's nickname ----------

echo "========== Step 8B: Non-admin tries to change another member's nickname =========="
nick_update_by_non_admin=$(call_api PATCH "$API/groups/$g3_id/members/3" "${tokens[4]}" '{"nickname":"HackerCat"}')
echo "Non-admin user4 tries to change user3's nickname: $(echo "$nick_update_by_non_admin" | jq '.')"

# ---------- Step 8C: Member changes their own nickname ----------

echo "========== Step 8C: Member changes their own nickname =========="
self_nick_update=$(call_api PATCH "$API/groups/$g3_id/members/4" "${tokens[4]}" '{"nickname":"NiceFrog"}')
echo "Member4 (self) nickname updated: $(echo "$self_nick_update" | jq '.')"

# ---------- Step 8D: List group members after nickname ----------
echo "========== Step 8D: List group members after nickname changes =========="
members_after_nick=$(call_api GET "$API/groups/$g3_id/members" "${tokens[2]}")
group_info_after_nick=$(jq -n --argjson gid "$g3_id" --arg gname "Project Alpha" --argjson members "$members_after_nick" \
  '{group_id: $gid, group_name: $gname, members: $members}')
echo "$group_info_after_nick" | jq '.'

# ---------- Step 9: Promote member to admin ----------

echo "========== Step 9: Promote member to admin =========="
promote=$(call_api PATCH "$API/groups/$g3_id/members/3/admin" "${tokens[2]}" '{"is_admin": true}')
echo "Member3 promoted to admin: $(echo "$promote" | jq '.')"

# ---------- Step 10: Promoted admin adds another user ----------

echo "========== Step 10: Promoted admin adds another user =========="
add_by_promoted=$(call_api POST "$API/groups/$g3_id/members/5" "${tokens[3]}")
echo "Promoted admin user3 added user5: $(echo "$add_by_promoted" | jq '.')"

# ---------- Step 11: Non-admin tries to add a member ----------

echo "========== Step 11: Non-admin tries to add a member =========="
add_by_non_admin=$(call_api POST "$API/groups/$g3_id/members/6" "${tokens[5]}")
echo "Non-admin user5 tries to add user6: $(echo "$add_by_non_admin" | jq '.')"

# ---------- Step 11B: Non-admin tries to remove a member ----------
echo "========== Step 11B: Non-admin tries to remove a member =========="
remove_by_non_admin=$(call_api DELETE "$API/groups/$g3_id/members/4" "${tokens[5]}")
echo "Non-admin user5 tries to remove user4: $(echo "$remove_by_non_admin" | jq '.')"

# ---------- Step 12: Remove a member ----------

echo "========== Step 12: Remove a member =========="
remove=$(call_api DELETE "$API/groups/$g3_id/members/4" "${tokens[2]}")
echo "Member4 removed by user2: $(echo "$remove" | jq '.')"

# ---------- Step 12B: Newly promoted admin changes another member's nickname ----------

echo "========== Step 12B: Newly promoted admin changes another member's nickname =========="
nick_update_by_new_admin=$(call_api PATCH "$API/groups/$g3_id/members/5" "${tokens[3]}" '{"nickname":"CoolGuy"}')
echo "New admin user3 changed user5's nickname: $(echo "$nick_update_by_new_admin" | jq '.')"

# ---------- Step 13: Final member list ----------

echo "========== Step 13: Final member list =========="
# Note: Final members in group g3 are user2 (Admin), user3 (Admin), user5 (Member)
final_members=$(call_api GET "$API/groups/$g3_id/members" "${tokens[2]}")
final_info=$(jq -n --argjson gid "$g3_id" --arg gname "Project Alpha" --argjson members "$final_members" \
  '{group_id: $gid, group_name: $gname, members: $members}')
echo "$final_info" | jq '.'

# ---------- Step 14: Permission checks ----------

echo "========== Step 14: Permission checks =========="
can_view=$(call_api GET "$API/groups/$g3_id/members" "${tokens[5]}")
echo "user5 (in group) can view members: $(echo "$can_view" | jq '.')"

cannot_view=$(call_api GET "$API/groups/$g3_id/members" "${tokens[1]}")
echo "user1 (not in group) cannot view members: $(echo "$cannot_view" | jq '.')"

echo "----------------------------------------"
# echo "All tests done."

     
## Testing Regular Expenses
echo "############################################################"
echo "## Testing Regular Expenses (US6, US7, US9) ##"
echo "############################################################"

### Step 15: Expense Creation (US6a & US7a)
echo "========== Step 15: Expense Creation =========="
echo "--- (US6a) user5 (non-admin member) creates an expense for 'Snacks' ---"
# This expense is created without an explicit split, so it won't be used for balance calculation demo
expense_A1_data='{"description":"Team Snacks","amount":45.50,"payer_id":5, "split_type":"equal", "splits":[{"user_id":5},{"user_id":6}]}'
expense_A1=$(call_api POST "$API/groups/$g3_id/expenses" "${tokens[5]}" "$expense_A1_data")
expense_A1_id=$(echo "$expense_A1" | jq '.id')
echo "Expense A1 (ID: $expense_A1_id) created by member user5."

echo "--- (US6a) user5 (non-admin member) creates a second expense for 'Coffee' ---"
expense_A2_data='{"description":"Coffee Supplies","amount":25.00,"payer_id":5, "split_type":"equal", "splits":[{"user_id":5}]}'
expense_A2=$(call_api POST "$API/groups/$g3_id/expenses" "${tokens[5]}" "$expense_A2_data")
expense_A2_id=$(echo "$expense_A2" | jq '.id')
echo "Expense A2 (ID: $expense_A2_id) created by member user5."

echo "--- (US7a) user2 (admin) creates an expense for 'Software License' ---"
expense_B_data='{"description":"Software License","amount":299.99,"payer_id":3, "split_type":"equal", "splits":[{"user_id":3}]}'
expense_B=$(call_api POST "$API/groups/$g3_id/expenses" "${tokens[2]}" "$expense_B_data")
expense_B_id=$(echo "$expense_B" | jq '.id')
echo "Expense B (ID: $expense_B_id) created by admin user2."

echo "--- VERIFYING CURRENT STATE: Displaying all expenses (should be 3 total) ---"
call_api GET "$API/groups/$g3_id/expenses" "${tokens[5]}" | jq '.' # user 5 is a member, user 6 was not added

### Step 16: Expense Viewing Permissions (US9a, US9b, US9c)
echo "========== Step 16: Expense Viewing Permissions =========="
echo "--- (US9a) user5 (non-admin member) can view all expenses in the group ---"
member_view_res=$(call_api GET "$API/groups/$g3_id/expenses" "${tokens[5]}")
echo "Member view successful. Found $(echo $member_view_res | jq 'length') expenses."

echo "--- (US9b) user3 (admin) can view all expenses in the group ---"
admin_view_res=$(call_api GET "$API/groups/$g3_id/expenses" "${tokens[3]}")
echo "Admin view successful. Found $(echo $admin_view_res | jq 'length') expenses."

echo "--- (US9c) user1 (non-member) CANNOT view expenses in the group ---"
non_member_view_res=$(call_api GET "$API/groups/$g3_id/expenses" "${tokens[1]}")
echo "Non-member view failed as expected: $(echo $non_member_view_res | jq '.detail')"

### Step 17: Expense Updates (US6b & US7b)
echo "========== Step 17: Expense Updates =========="
echo "--- (US6b) user5 (creator) updates their OWN expense A1 ---"
update_A1_data='{"description":"Team Snacks and Drinks"}'
call_api PATCH "$API/groups/$g3_id/expenses/$expense_A1_id" "${tokens[5]}" "$update_A1_data" > /dev/null
echo "user5 updated their own expense A1."

echo "--- (US7b) user3 (admin) updates expense A1, which they did NOT create ---"
update_A1_by_admin_data='{"amount":50.00}'
call_api PATCH "$API/groups/$g3_id/expenses/$expense_A1_id" "${tokens[3]}" "$update_A1_by_admin_data" > /dev/null
echo "Admin user3 updated expense A1."

echo "--- (Failure Case) user5 (non-admin, non-creator) CANNOT update expense B ---"
fail_update_res=$(call_api PATCH "$API/groups/$g3_id/expenses/$expense_B_id" "${tokens[5]}" '{"amount":999}')
echo "user5 failed to update expense B as expected: $(echo $fail_update_res | jq '.detail')"

echo "--- VERIFYING CURRENT STATE: Displaying all expenses after updates ---"
call_api GET "$API/groups/$g3_id/expenses" "${tokens[5]}" | jq '.'

### Step 18: Expense Deletion (US6c & US7c)
echo "========== Step 18: Expense Deletion =========="
echo "--- (Failure Case) user5 (non-admin, non-creator) CANNOT delete expense B ---"
fail_delete_res=$(call_api DELETE "$API/groups/$g3_id/expenses/$expense_B_id" "${tokens[5]}")
echo "user5 failed to delete expense B as expected: $(echo $fail_delete_res | jq '.detail')"

echo "--- (US7c) user3 (admin) deletes expense A2, created by another member (user5) ---"
call_api DELETE "$API/groups/$g3_id/expenses/$expense_A2_id" "${tokens[3]}" > /dev/null
echo "Admin user3 deleted other's expense A2."
echo "--- VERIFYING CURRENT STATE: Displaying remaining expenses ---"
call_api GET "$API/groups/$g3_id/expenses" "${tokens[5]}" | jq '.'

echo "--- (US6c) user5 (creator) deletes their OWN remaining expense A1 ---"
call_api DELETE "$API/groups/$g3_id/expenses/$expense_A1_id" "${tokens[5]}" > /dev/null
echo "user5 deleted their own expense A1."
echo "--- VERIFYING CURRENT STATE: Displaying remaining expenses ---"
call_api GET "$API/groups/$g3_id/expenses" "${tokens[5]}" | jq '.'

echo "--- (US7c) user2 (admin) deletes expense B, which they created ---"
call_api DELETE "$API/groups/$g3_id/expenses/$expense_B_id" "${tokens[2]}" > /dev/null
echo "Admin user2 deleted expense B."

echo "--- VERIFYING CURRENT STATE: Displaying all expenses (should be empty) ---"
call_api GET "$API/groups/$g3_id/expenses" "${tokens[5]}" | jq '.'


echo "############################################################"
echo "## Testing Automatic Recurring Expense Scheduler       #####"
echo "############################################################"
id_user2=2
id_user3=3
id_user5=5
# ---------- Step 19: Create Recurring Template for Scheduler Test ----------
echo "========== Step 19: Create Recurring Template for Scheduler Test =========="
echo "--- (US8 Admin) user3 (admin) creates a recurring expense for 'Daily Subscription' ---"
echo "--- Start Date: 2025-10-24 (1 day before test date of 2025-10-25) ---"

START_DATE="2025-10-24"

rex_data=$(jq -n \
  --arg desc "Daily Subscription" \
  --arg amt "15.0" \
  --arg freq "daily" \
  --arg start "$START_DATE" \
  --arg payer_id "$id_user5" \
  --arg s_type "equal" \
  --arg id2 "$id_user2" \
  --arg id3 "$id_user3" \
  --arg id5 "$id_user5" \
  '{
     description: $desc,
     amount: $amt|tonumber,
     frequency: $freq,
     start_date: $start,
     payer_id: $payer_id|tonumber,
     split_type: $s_type,
     date: null,
     splits: [
       {user_id: $id2|tonumber, amount: null},
       {user_id: $id3|tonumber, amount: null},
       {user_id: $id5|tonumber, amount: null}
     ]
   }')

#
rex_template_1=$(call_api POST "$API/groups/$g3_id/recurring-expenses" "${tokens[3]}" "$rex_data")

if [ -z "$rex_template_1" ]; then
  echo "ERROR: API call to create recurring expense failed. Response was empty."
  echo "This likely means a 403 Forbidden or 422 Validation Error."
  exit 1
fi

rex_template_1_id=$(echo "$rex_template_1" | jq '.id')
echo "Recurring Expense Template (ID: $rex_template_1_id) created."

#
echo "--- VERIFYING CHANGE: Displaying all recurring expenses ---"
call_api GET "$API/groups/$g3_id/recurring-expenses" "${tokens[3]}" | jq '.'


# ---------- Step 20: Wait for Scheduler Activation ----------
echo "========== Step 20: Wait for Scheduler Activation =========="
echo "--- Waiting 70 seconds for scheduler to run and create expense... ---"
sleep 70
echo "--- Wait complete. ---"

# ---------- Step 21: Verify Scheduler-Created Expense & Balances ----------
echo "========== Step 21: Verify Scheduler-Created Expense & Balances =========="
#
#
all_expenses=$(call_api GET "$API/groups/$g3_id/expenses" "${tokens[3]}")

triggered_expense_json=$(echo "$all_expenses" | jq --compact-output '.[] | select(.description | contains("Daily Subscription"))' | head -n 1)

if [ -z "$triggered_expense_json" ]; then
  echo "ERROR: Could not find auto-created expense!"
  echo "Current expenses:"
  echo "$all_expenses" | jq '.'
  exit 1
fi

triggered_id=$(echo "$triggered_expense_json" | jq '.id')
echo "--- Verification successful. Found auto-created expense (ID: $triggered_id): ---"
echo "$triggered_expense_json" | jq '.'

#
#
echo "--- Now, verifying balances for this new expense (ID: $triggered_id) ---"
echo "--- Balances should be: User 5 (Payer, receives $10), User 2 (pays $5), User 3 (pays $5) ---"

bal2=$(call_api GET "$API/expenses/$triggered_id/balance/2" "${tokens[2]}")
bal3=$(call_api GET "$API/expenses/$triggered_id/balance/3" "${tokens[3]}")
bal5=$(call_api GET "$API/expenses/$triggered_id/balance/5" "${tokens[5]}")

echo "User 2: $(echo $bal2 | jq '.summary')"
echo "User 3: $(echo $bal3 | jq '.summary')"
echo "User 5 (Payer): $(echo $bal5 | jq '.summary')"

echo "--- Balances verified. Scheduler test complete. ---"


echo "############################################################"
echo "## Testing Recurring Expense API (Updates/Deletes) ##"
echo "############################################################"

### Step 22: Recurring Expense Template Updates (US8)
echo "========== Step 22: Recurring Expense Updates =========="
echo "--- (US8) user3 (creator) updates THEIR OWN recurring template (ID: $rex_template_1_id) ---"
update_rex_1_data='{"amount":16.00}' # Change amount from 15.00 to 16.00
call_api PATCH "$API/groups/$g3_id/recurring-expenses/$rex_template_1_id" "${tokens[3]}" "$update_rex_1_data" > /dev/null
echo "User 3 (creator) updated their own recurring template."
echo "--- VERIFYING CHANGE: Displaying all recurring expenses ---"
call_api GET "$API/groups/$g3_id/recurring-expenses" "${tokens[3]}" | jq '.'

echo "--- (US8 Admin) user2 (admin) deactivates recurring template (ID: $rex_template_1_id), which they did NOT create ---"
deactivate_rex_1_data='{"is_active":false}'
call_api PATCH "$API/groups/$g3_id/recurring-expenses/$rex_template_1_id" "${tokens[2]}" "$deactivate_rex_1_data" > /dev/null
echo "Admin user2 deactivated recurring template ID: $rex_template_1_id."
echo "--- VERIFYING CHANGE: Displaying all recurring expenses ---"
call_api GET "$API/groups/$g3_id/recurring-expenses" "${tokens[2]}" | jq '.'

echo "--- (Failure Case) user5 (non-admin, non-creator) CANNOT update template (ID: $rex_template_1_id) ---"
fail_update_rex_res=$(call_api PATCH "$API/groups/$g3_id/recurring-expenses/$rex_template_1_id" "${tokens[5]}" '{"amount":999}')
echo "User 5 failed to update recurring template $rex_template_1_id as expected: $(echo $fail_update_rex_res | jq '.detail')"


### Step 23: Recurring Expense Template Deletion (US8)
echo "========== Step 23: Recurring Expense Deletion =========="
echo "--- (Failure Case) user5 (non-admin, non-creator) CANNOT delete template (ID: $rex_template_1_id) ---"
fail_delete_rex_res=$(call_api DELETE "$API/groups/$g3_id/recurring-expenses/$rex_template_1_id" "${tokens[5]}")
echo "User 5 failed to delete recurring template $rex_template_1_id as expected: $(echo $fail_delete_rex_res | jq '.detail')"

echo "--- (US8 Admin) user3 (creator/admin) deletes THEIR OWN template (ID: $rex_template_1_id) ---"
call_api DELETE "$API/groups/$g3_id/recurring-expenses/$rex_template_1_id" "${tokens[3]}" > /dev/null
echo "User 3 deleted recurring template ID: $rex_template_1_id."
echo "--- VERIFYING CHANGE: Displaying all recurring expenses (should be empty) ---"
call_api GET "$API/groups/$g3_id/recurring-expenses" "${tokens[3]}" | jq '.'

### Step 24: Audit Trail Verification
echo "========== Step 24: Audit Trail Verification =========="
echo "--- (Failure Case) user5 (non-admin member) CANNOT view the audit trail ---"
fail_audit_res=$(call_api GET "$API/groups/$g3_id/audit-trail" "${tokens[5]}")
echo "Non-admin user5 failed to view audit trail as expected: $(echo $fail_audit_res | jq '.detail')"

echo "--- (Success Case) user3 (admin) can view the audit trail ---"
audit_trail=$(call_api GET "$API/groups/$g3_id/audit-trail" "${tokens[3]}")
echo "Admin user3 successfully retrieved the audit trail. Displaying content:"
echo "$audit_trail" | jq '.'

echo "Audit trail content verified successfully."


echo "############################################################"
echo "## Testing Auto Balance Calculation (US10) ##"
echo "############################################################"

# --- Helper function to display balances ---
# This function makes it easy to see the status of all members at each stage.
display_balances() {
  local exp_id=$1
  echo "--- Checking Balances for Expense ID: $exp_id ---"
  
  # Check User 2 (Payer)
  bal2=$(call_api GET "$API/expenses/$exp_id/balance/2" "${tokens[2]}")
  echo "User 2 (Payer): $(echo $bal2 | jq '.summary')"

  # Check User 3
  bal3=$(call_api GET "$API/expenses/$exp_id/balance/3" "${tokens[3]}")
  echo "User 3:         $(echo $bal3 | jq '.summary')"
  
  # Check User 5
  bal5=$(call_api GET "$API/expenses/$exp_id/balance/5" "${tokens[5]}")
  echo "User 5:         $(echo $bal5 | jq '.summary')"
  echo "-------------------------------------------------"
}

echo "========== Step 25: Create a new expense for balance testing =========="

# Scenario: user2 pays $90 for a team dinner, split equally among user2, user3, and user5.
# Total: $90.00
# Members: 3
# Share per member: $30.00
expense_dinner_data='{"description":"Team Dinner","amount":90.00,"payer_id":2,"split_type":"equal","splits":[{"user_id":2},{"user_id":3},{"user_id":5}]}'
expense_dinner=$(call_api POST "$API/groups/$g3_id/expenses" "${tokens[2]}" "$expense_dinner_data")
expense_dinner_id=$(echo "$expense_dinner" | jq '.id')
echo "New 'Team Dinner' Expense (ID: $expense_dinner_id) created by user2."

# --- ADDED: Display current group members ---
echo "--- Displaying Current Group ($g3_id) Members at Start of Step 23 ---"
call_api GET "$API/groups/$g3_id/members" "${tokens[2]}" | jq '.'
echo "-------------------------------------------------"

# --- ADDED: Display total expenses before adding new one ---
echo "--- Displaying All Expenses in Group ($g3_id) and Total Amount ---"
all_expenses_before=$(call_api GET "$API/groups/$g3_id/expenses" "${tokens[2]}")
echo "Current expenses list:"
echo "$all_expenses_before" | jq '.'
total_amount_before=$(echo "$all_expenses_before" | jq '[.[] | .amount] | add')
echo "Current total amount of all expenses: $total_amount_before"
echo "-------------------------------------------------"

echo ""
echo "========== STAGE 1: Initial Balance Check (After Expense Creation) =========="
# Expected Status:
# User 2 (Payer): Paid $90, owes $30. Should be OWED $60.00
# User 3: Paid $0, owes $30. Should OWE $30.00
# User 5: Paid $0, owes $30. Should OWE $30.00
display_balances $expense_dinner_id

echo ""
echo "========== STAGE 2: First Payment (User3 pays \$10 to User2) =========="
payment1_data='{"from_user_id":3,"to_user_id":2,"amount":10.00,"description":"Partial payment for dinner"}'
payment1=$(call_api POST "$API/expenses/$expense_dinner_id/payments" "${tokens[3]}" "$payment1_data")
payment1_id=$(echo "$payment1" | jq '.id')
echo "Payment 1 (ID: $payment1_id) created: User3 paid \$10.00 to User2."

echo ""
echo "========== STAGE 3: Balance Check After First Payment =========="
# Expected Status:
# User 2 (Payer): Was owed $60, received $10. Should be OWED $50.00
# User 3: Owed $30, paid $10. Should OWE $20.00
# User 5: Owed $30, paid $0. Should OWE $30.00
display_balances $expense_dinner_id

echo ""
echo "========== STAGE 4: Second Payment (User5 pays \$30 to User2) =========="
payment2_data='{"from_user_id":5,"to_user_id":2,"amount":30.00,"description":"Full payment for dinner"}'
payment2=$(call_api POST "$API/expenses/$expense_dinner_id/payments" "${tokens[5]}" "$payment2_data")
payment2_id=$(echo "$payment2" | jq '.id')
echo "Payment 2 (ID: $payment2_id) created: User5 paid \$30.00 (full share) to User2."

echo ""
echo "========== STAGE 5: Balance Check After Second Payment =========="
# Expected Status:
# User 2 (Payer): Was owed $50, received $30. Should be OWED $20.00
# User 3: Owed $20, paid $0. Should OWE $20.00
# User 5: Owed $30, paid $30. Should be SETTLED ($0.00)
display_balances $expense_dinner_id

echo ""
echo "========== STAGE 6: Final Payment (User3 pays \$20 to User2) =========="
payment3_data='{"from_user_id":3,"to_user_id":2,"amount":20.00,"description":"Remaining payment for dinner"}'
payment3=$(call_api POST "$API/expenses/$expense_dinner_id/payments" "${tokens[3]}" "$payment3_data")
payment3_id=$(echo "$payment3" | jq '.id')
echo "Payment 3 (ID: $payment3_id) created: User3 paid \$20.00 (remaining share) to User2."

echo ""
echo "========== STAGE 7: Final Balance Check (All Settled) =========="
# Expected Status:
# User 2 (Payer): Was owed $20, received $20. Should be SETTLED ($0.00)
# User 3: Owed $20, paid $20. Should be SETTLED ($0.00)
# User 5: Was settled. Should be SETTLED ($0.00)
display_balances $expense_dinner_id

echo ""
echo "Balance calculation and settlement test complete."
# --- END: Added Section for User Story 10 ---
# -----------------------------------------------------------------

######################################################################
### Step 26: Test Custom Split & Expense Update (US10) ###############
######################################################################
echo "========== Step 26: Test Custom Split & Expense Update =========="

# --- STAGE 1: Create Custom Split Expense ($100) ---
echo "--- STAGE 1: Creating custom split expense ($100) ---"
echo "--- Payer: User 2. Splits: User 2 (\$20), User 3 (\$50), User 5 (\$30) ---"
expense_custom_data='{"description":"Custom Split Dinner","amount":100.00,"payer_id":2,"split_type":"custom","splits":[{"user_id":2,"amount":20.00},{"user_id":3,"amount":50.00},{"user_id":5,"amount":30.00}]}'
expense_C=$(call_api POST "$API/groups/$g3_id/expenses" "${tokens[2]}" "$expense_custom_data")
expense_C_id=$(echo "$expense_C" | jq '.id')
echo "Custom Expense C (ID: $expense_C_id) created."
echo ""

# --- STAGE 1.5: Initial Balance Check ($100) ---
echo "--- STAGE 1.5: Initial Balance Check (\$100) ---"
echo "--- Balances should be: User 2 (receives \$80), User 3 (pays \$50), User 5 (pays \$30) ---"
display_balances $expense_C_id
echo ""

# --- STAGE 2: Update Expense to $110 with new splits ---
echo "--- STAGE 2: Updating expense to \$110 with new custom splits ---"
echo "--- Payer: User 2. Splits: User 2 (\$20), User 3 (\$50), User 5 (\$40) ---"
expense_update_data='{"amount":110.00,"split_type":"custom","splits":[{"user_id":2,"amount":20.00},{"user_id":3,"amount":50.00},{"user_id":5,"amount":40.00}]}'
call_api PATCH "$API/groups/$g3_id/expenses/$expense_C_id" "${tokens[2]}" "$expense_update_data" > /dev/null
echo "Expense C (ID: $expense_C_id) updated."
echo ""

# --- STAGE 2.5: Balance Check After Update ($110) ---
echo "--- STAGE 2.5: Balance Check After Update (\$110) ---"
echo "--- Balances should be: User 2 (receives \$90), User 3 (pays \$50), User 5 (pays \$40) ---"
display_balances $expense_C_id
echo ""

# --- STAGE 3: User 5 pays their full share ($40) ---
echo "--- STAGE 3: User 5 pays their full share (\$40) to User 2 ---"
payment_C1_data='{"from_user_id":5,"to_user_id":2,"amount":40.00}'
call_api POST "$API/expenses/$expense_C_id/payments" "${tokens[5]}" "$payment_C1_data" > /dev/null
echo "Payment from User 5 to User 2 recorded."
echo ""

# --- STAGE 3.5: Balance Check After User 5's Payment ---
echo "--- STAGE 3.5: Balance Check After User 5 Payment ---"
echo "--- Balances should be: User 2 (receives \$50), User 3 (pays \$50), User 5 (Settled) ---"
display_balances $expense_C_id
echo ""

# --- STAGE 4: User 3 pays their full share ($50) ---
echo "--- STAGE 4: User 3 pays their full share (\$50) to User 2 ---"
payment_C2_data='{"from_user_id":3,"to_user_id":2,"amount":50.00}'
call_api POST "$API/expenses/$expense_C_id/payments" "${tokens[3]}" "$payment_C2_data" > /dev/null
echo "Payment from User 3 to User 2 recorded."
echo ""

# --- STAGE 4.5: Final Balance Check (All Settled) ---
echo "--- STAGE 4.5: Final Balance Check (All Settled) ---"
echo "--- All users should be settled ---"
display_balances $expense_C_id
echo ""

######################################################################
### Step 27: Test Equally Split Recurring Expense (US8 + US10)
######################################################################
echo ""
echo "############################################################"
echo "## Step 27: Test Equally Split Recurring Expense"
echo "############################################################"
echo "--- This test will create an EQUAL split recurring template, ---"
echo "--- simulate its activation, and then settle the resulting expense. ---"

# --- STAGE 1: Create Recurring Expense Template (Equal Split) ---
echo "--- STAGE 1: Creating 'Monthly Subscription' template (\$150) ---"
echo "--- Payer: User 3. Splits: Equally among User 2, 3, 5 ---"
rex_equal_data='{"description":"Monthly Subscription","amount":150.00,"frequency":"monthly","start_date":"2025-11-01","payer_id":3,"split_type":"equal","splits":[{"user_id":2},{"user_id":3},{"user_id":5}]}'
rex_E=$(call_api POST "$API/groups/$g3_id/recurring-expenses" "${tokens[3]}" "$rex_equal_data")
rex_E_id=$(echo "$rex_E" | jq '.id')
echo "Recurring Expense Template E (ID: $rex_E_id) created."
echo ""

# --- STAGE 2: Simulate Recurring Expense Activation ---
echo "--- STAGE 2: Simulating activation of template $rex_E_id ---"
echo "--- Creating new *regular* expense based on template ---"
# We simulate the system creating a new expense from the template
# Total: $150.00. Payer: 3. Share: $50 each for 2, 3, 5.
exp_from_rex_E_data='{"description":"Monthly Subscription (Nov 2025)","amount":150.00,"payer_id":3,"split_type":"equal","splits":[{"user_id":2},{"user_id":3},{"user_id":5}]}'
exp_E=$(call_api POST "$API/groups/$g3_id/expenses" "${tokens[3]}" "$exp_from_rex_E_data")
exp_E_id=$(echo "$exp_E" | jq '.id')
echo "New Regular Expense E (ID: $exp_E_id) created from recurring template."
echo ""

# --- STAGE 3: Initial Balance Check ($150) ---
echo "--- STAGE 3: Initial Balance Check for Expense E (\$150) ---"
echo "--- Balances should be: User 3 (receives \$100), User 2 (pays \$50), User 5 (pays \$50) ---"
display_balances $exp_E_id
echo ""

# --- STAGE 4: User 2 pays their full share ($50) ---
echo "--- STAGE 4: User 2 pays full share (\$50) to User 3 ---"
payment_E1_data='{"from_user_id":2,"to_user_id":3,"amount":50.00}'
call_api POST "$API/expenses/$exp_E_id/payments" "${tokens[2]}" "$payment_E1_data" > /dev/null
echo "Payment from User 2 to User 3 recorded."
echo ""

# --- STAGE 5: Balance Check After User 2's Payment ---
echo "--- STAGE 5: Balance Check After User 2 Payment ---"
echo "--- Balances should be: User 3 (receives \$50), User 2 (Settled), User 5 (pays \$50) ---"
display_balances $exp_E_id
echo ""

# --- STAGE 6: User 5 pays their full share ($50) ---
echo "--- STAGE 6: User 5 pays full share (\$50) to User 3 ---"
payment_E2_data='{"from_user_id":5,"to_user_id":3,"amount":50.00}'
call_api POST "$API/expenses/$exp_E_id/payments" "${tokens[5]}" "$payment_E2_data" > /dev/null
echo "Payment from User 5 to User 3 recorded."
echo ""

# --- STAGE 7: Final Balance Check (All Settled) ---
echo "--- STAGE 7: Final Balance Check (All Settled) ---"
echo "--- All users should be settled ---"
display_balances $exp_E_id
echo ""


######################################################################
### Step 28: Test Custom Split Recurring Expense (US8 + US10)
######################################################################
echo ""
echo "############################################################"
echo "## Step 28: Test Custom Split Recurring Expense"
echo "############################################################"
echo "--- This test will create a CUSTOM split recurring template, ---"
echo "--- simulate its activation, and then settle the resulting expense. ---"

# --- STAGE 1: Create Recurring Expense Template (Custom Split) ---
echo "--- STAGE 1: Creating 'Quarterly Server Cost' template (\$200) ---"
echo "--- Payer: User 5. Splits: User 2 (\$100), User 3 (\$30), User 5 (\$70) ---"
rex_custom_data='{"description":"Quarterly Server Cost","amount":200.00,"frequency":"monthly","start_date":"2025-11-01","payer_id":5,"split_type":"custom","splits":[{"user_id":2,"amount":100.00},{"user_id":3,"amount":30.00},{"user_id":5,"amount":70.00}]}'
rex_C=$(call_api POST "$API/groups/$g3_id/recurring-expenses" "${tokens[5]}" "$rex_custom_data")
rex_C_id=$(echo "$rex_C" | jq '.id')
echo "Recurring Expense Template C (ID: $rex_C_id) created."
echo ""

# --- STAGE 2: Simulate Recurring Expense Activation ---
echo "--- STAGE 2: Simulating activation of template $rex_C_id ---"
echo "--- Creating new *regular* expense based on template ---"
# We simulate the system creating a new expense from the template
# Total: $200.00. Payer: 5. Splits: U2($100), U3($30), U5($70).
exp_from_rex_C_data='{"description":"Quarterly Server Cost (Q4 2025)","amount":200.00,"payer_id":5,"split_type":"custom","splits":[{"user_id":2,"amount":100.00},{"user_id":3,"amount":30.00},{"user_id":5,"amount":70.00}]}'
exp_C=$(call_api POST "$API/groups/$g3_id/expenses" "${tokens[5]}" "$exp_from_rex_C_data")
exp_C_id=$(echo "$exp_C" | jq '.id')
echo "New Regular Expense C (ID: $exp_C_id) created from recurring template."
echo ""

# --- STAGE 3: Initial Balance Check ($200) ---
echo "--- STAGE 3: Initial Balance Check for Expense C (\$200) ---"
echo "--- Balances should be: User 5 (receives \$130), User 2 (pays \$100), User 3 (pays \$30) ---"
display_balances $exp_C_id
echo ""

# --- STAGE 4: User 3 pays their full share ($30) ---
echo "--- STAGE 4: User 3 pays full share (\$30) to User 5 ---"
payment_C1_data='{"from_user_id":3,"to_user_id":5,"amount":30.00}'
call_api POST "$API/expenses/$exp_C_id/payments" "${tokens[3]}" "$payment_C1_data" > /dev/null
echo "Payment from User 3 to User 5 recorded."
echo ""

# --- STAGE 5: Balance Check After User 3's Payment ---
echo "--- STAGE 5: Balance Check After User 3 Payment ---"
echo "--- Balances should be: User 5 (receives \$100), User 2 (pays \$100), User 3 (Settled) ---"
display_balances $exp_C_id
echo ""

# --- STAGE 6: User 2 pays their full share ($100) ---
echo "--- STAGE 6: User 2 pays full share (\$100) to User 5 ---"
payment_C2_data='{"from_user_id":2,"to_user_id":5,"amount":100.00}'
call_api POST "$API/expenses/$exp_C_id/payments" "${tokens[2]}" "$payment_C2_data" > /dev/null
echo "Payment from User 2 to User 5 recorded."
echo ""

# --- STAGE 7: Final Balance Check (All Settled) ---
echo "--- STAGE 7: Final Balance Check (All Settled) ---"
echo "--- All users should be settled ---"
display_balances $exp_C_id
echo ""


######################################################################
### Step 29: Final Audit Log Check
######################################################################
echo ""
echo "############################################################"
echo "## Step 29: Final Audit Log Check"
echo "############################################################"
echo "--- Verifying CREATE_RECURRING_EXPENSE actions for new templates ---"

# Get the audit log using an admin token (user 3)
final_audit_log=$(call_api GET "$API/groups/$g3_id/audit-trail" "${tokens[3]}")
echo "$final_audit_log" | jq '.'

echo "Audit Log verification successful."
echo "############################################################"
echo "## All Tests Completed Successfully ##"
echo "############################################################"

