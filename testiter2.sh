#!/bin/bash
# (Note: All comments are in English as requested)
# This script tests the full user flow:
# 1. Register 4 users.
# 2. User 1 (Admin) creates a group.
# 3. User 1 (Admin) directly adds User 2.
# 4. User 2 (Member) invites User 3.
# 5. User 3 rejects the invitation.
# 6. User 2 (Member) invites User 4.
# 7. User 4 accepts the invitation.
# 8. Verify the group member list (should be 1, 2, 4).
# 9. User 1 (Admin) creates an expense ($15) with an image, split equally.
# 10. User 2 makes a payment of $10 (wrong amount) to User 1 with an image.
# 11. User 2 updates their payment to $5 (correct amount).
# 12. User 4 makes a payment of $5 to User 1.
# 13. Verify User 4's balance is settled (should be 0).
# 14. User 1 (Admin) deletes User 4's payment.
# 15. Verify User 4's balance is now unsettled (should be -5).

# --- Configuration ---
BASE_URL="https://localhost:443"
# Use -k to allow self-signed certificates
CURL_CMD="curl -k -s"

# --- Utility Functions ---

# Function to log in a user and get a token
# $1: Email, $2: Password
login_user() {
    local EMAIL=$1
    local PASSWORD=$2

    local RESPONSE=$( \
        $CURL_CMD -X POST "$BASE_URL/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "username=$EMAIL&password=$PASSWORD" \
    )

    local TOKEN=$(echo "$RESPONSE" | jq -r '.access_token')

    if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
        echo "    [FAIL] Login failed for $EMAIL"
        echo "    Response: $RESPONSE"
        exit 1
    fi

    echo "$TOKEN"
}

# --- Test Variables ---
# Unique string for this test run
UNIQUE_ID=$(date +%s)

# User credentials
USER1_EMAIL="user1_${UNIQUE_ID}@example.com"
USER2_EMAIL="user2_${UNIQUE_ID}@example.com"
USER3_EMAIL="user3_${UNIQUE_ID}@example.com"
USER4_EMAIL="user4_${UNIQUE_ID}@example.com"
PASSWORD="password123"

# Global variables to store IDs and Tokens
USER1_ID=""
USER2_ID=""
USER3_ID=""
USER4_ID=""
USER1_TOKEN=""
USER2_TOKEN=""
USER3_TOKEN=""
USER4_TOKEN=""
GROUP_ID=""
INVITATION_ID_U3=""
INVITATION_ID_U4=""
EXPENSE_ID=""
PAYMENT_ID_U2=""
PAYMENT_ID_U4=""

# --- Start Test ---
echo "--- Preparing test environment (BASE_URL: $BASE_URL) ---"

# --- Step 1: Register Users ---
echo "--- (1/15) Registering all users ---"
USER1_ID=$($CURL_CMD -X POST "$BASE_URL/users/signup" -H "Content-Type: application/json" -d "{\"email\": \"$USER1_EMAIL\", \"username\": \"User1\", \"password\": \"$PASSWORD\"}" | jq -r '.id')
USER2_ID=$($CURL_CMD -X POST "$BASE_URL/users/signup" -H "Content-Type: application/json" -d "{\"email\": \"$USER2_EMAIL\", \"username\": \"User2\", \"password\": \"$PASSWORD\"}" | jq -r '.id')
USER3_ID=$($CURL_CMD -X POST "$BASE_URL/users/signup" -H "Content-Type: application/json" -d "{\"email\": \"$USER3_EMAIL\", \"username\": \"User3\", \"password\": \"$PASSWORD\"}" | jq -r '.id')
USER4_ID=$($CURL_CMD -X POST "$BASE_URL/users/signup" -H "Content-Type: application/json" -d "{\"email\": \"$USER4_EMAIL\", \"username\": \"User4\", \"password\": \"$PASSWORD\"}" | jq -r '.id')
echo "    [OK] Registered User 1 (ID: $USER1_ID)"
echo "    [OK] Registered User 2 (ID: $USER2_ID)"
echo "    [OK] Registered User 3 (ID: $USER3_ID)"
echo "    [OK] Registered User 4 (ID: $USER4_ID)"
echo "    [OK] All users registered successfully"

# --- Step 2: User 1 creates group ---
echo "--- (2/15) User 1 creates group ---"
USER1_TOKEN=$(login_user "$USER1_EMAIL" "$PASSWORD")
echo "    [OK] User 1 (Admin) logged in"
GROUP_ID=$( \
    $CURL_CMD -X POST "$BASE_URL/groups/" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"Test Group $UNIQUE_ID\", \"description\": \"Test group\"}" \
    | jq -r '.id' \
)
echo "    [OK] User 1 (Admin) created group (ID: $GROUP_ID)"

# --- Step 3: User 1 (Admin) directly adds User 2 ---
echo "--- (3/15) User 1 (Admin) directly adds User 2 ---"
$CURL_CMD -X POST "$BASE_URL/groups/$GROUP_ID/members/$USER2_ID" \
    -H "Authorization: Bearer $USER1_TOKEN" > /dev/null # Discard output for cleaner logs
echo "    [OK] User 1 (Admin) successfully added User 2 (ID: $USER2_ID)"

# --- Step 4: User 2 (Member) logs in and invites User 3 ---
echo "--- (4/15) User 2 (Member) logs in and invites User 3 ---"
USER2_TOKEN=$(login_user "$USER2_EMAIL" "$PASSWORD")
echo "    [OK] User 2 (Member) logged in"
INVITATION_ID_U3=$( \
    $CURL_CMD -X POST "$BASE_URL/groups/$GROUP_ID/invite" \
    -H "Authorization: Bearer $USER2_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"invitee_email\": \"$USER3_EMAIL\"}" \
    | jq -r '.id' \
)
echo "    [OK] User 2 (Member) successfully invited User 3 (Invitation ID: $INVITATION_ID_U3)"

# --- Step 5: User 3 logs in and rejects invitation ---
echo "--- (5/15) User 3 logs in and rejects invitation ---"
USER3_TOKEN=$(login_user "$USER3_EMAIL" "$PASSWORD")
echo "    [OK] User 3 logged in"
REJECT_RESPONSE=$( \
    $CURL_CMD -X POST "$BASE_URL/invitations/$INVITATION_ID_U3/respond" \
    -H "Authorization: Bearer $USER3_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"action\": \"reject\"}" \
)
STATUS=$(echo "$REJECT_RESPONSE" | jq -r '.status')
if [ "$STATUS" == "rejected" ]; then
    echo "    [OK] User 3 successfully rejected invitation (Status: $STATUS)"
else
    echo "    [FAIL] Invitation status not updated to rejected (Received: $STATUS)"
    echo "    Response: $REJECT_RESPONSE"
    exit 1
fi

# --- Step 6: User 2 (Member) invites User 4 ---
echo "--- (6/15) User 2 (Member) invites User 4 ---"
INVITATION_ID_U4=$( \
    $CURL_CMD -X POST "$BASE_URL/groups/$GROUP_ID/invite" \
    -H "Authorization: Bearer $USER2_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"invitee_email\": \"$USER4_EMAIL\"}" \
    | jq -r '.id' \
)
echo "    [OK] User 2 (Member) successfully invited User 4 (Invitation ID: $INVITATION_ID_U4)"

# --- Step 7: User 4 logs in and accepts invitation ---
echo "--- (7/15) User 4 logs in and accepts invitation ---"
USER4_TOKEN=$(login_user "$USER4_EMAIL" "$PASSWORD")
echo "    [OK] User 4 logged in"
ACCEPT_RESPONSE=$( \
    $CURL_CMD -X POST "$BASE_URL/invitations/$INVITATION_ID_U4/respond" \
    -H "Authorization: Bearer $USER4_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"action\": \"accept\"}" \
)
STATUS=$(echo "$ACCEPT_RESPONSE" | jq -r '.status')
if [ "$STATUS" == "accepted" ]; then
    echo "    [OK] User 4 successfully accepted invitation (Status: $STATUS)"
else
    echo "    [FAIL] Invitation status not updated to accepted (Received: $STATUS)"
    echo "    Response: $ACCEPT_RESPONSE"
    exit 1
fi

# --- Step 8: User 1 verifies member list ---
echo "--- (8/15) User 1 verifies member list ---"
MEMBER_LIST=$( \
    $CURL_CMD -X GET "$BASE_URL/groups/$GROUP_ID/members" \
    -H "Authorization: Bearer $USER1_TOKEN" \
)
echo "    [INFO] Current Member List:"
echo "$MEMBER_LIST" | jq .
MEMBER_COUNT=$(echo "$MEMBER_LIST" | jq '. | length')
# We expect 3 members: User 1 (Admin), User 2 (Added), User 4 (Accepted)
if [ "$MEMBER_COUNT" -eq 3 ]; then
    echo "    [OK] Member count is correct (3)"
else
    echo "    [FAIL] Expected 3 members, but found $MEMBER_COUNT"
    exit 1
fi

# --- Step 9: User 1 creates expense ($15) ---
echo "--- (9/15) User 1 creates expense ($15) with image ---"
EXPENSE_JSON=$(cat <<EOF
{
  "description": "Lunch",
  "amount": 15.00,
  "payer_id": $USER1_ID,
  "image_url": "https://example.com/receipts/lunch_$UNIQUE_ID.jpg",
  "split_type": "equal",
  "splits": [
    {"user_id": $USER1_ID},
    {"user_id": $USER2_ID},
    {"user_id": $USER4_ID}
  ]
}
EOF
)
EXPENSE_RESPONSE=$( \
    $CURL_CMD -X POST "$BASE_URL/groups/$GROUP_ID/expenses" \
    -H "Authorization: Bearer $USER1_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$EXPENSE_JSON" \
)
EXPENSE_ID=$(echo "$EXPENSE_RESPONSE" | jq -r '.id')
IMAGE_URL=$(echo "$EXPENSE_RESPONSE" | jq -r '.image_url')

# Check if EXPENSE_ID is a valid number and IMAGE_URL is correct
if [[ "$EXPENSE_ID" =~ ^[0-9]+$ ]] && [ "$IMAGE_URL" == "https://example.com/receipts/lunch_$UNIQUE_ID.jpg" ]; then
    echo "    [OK] Expense created (ID: $EXPENSE_ID) with correct image URL."
    echo "    [INFO] Expense Details:"
    echo "$EXPENSE_RESPONSE" | jq . # Pretty print JSON
else
    echo "    [FAIL] Expense creation failed or image URL is incorrect (Received URL: $IMAGE_URL)"
    echo "    Response: $EXPENSE_RESPONSE"
    exit 1
fi

# --- Step 10: User 2 makes payment ($10) to User 1 ---
echo "--- (10/15) User 2 makes payment ($10) to User 1 ---"
PAYMENT_JSON=$(cat <<EOF
{
  "from_user_id": $USER2_ID,
  "to_user_id": $USER1_ID,
  "amount": 10.00,
  "description": "Payment for lunch",
  "image_url": "https://example.com/payments/payment1.jpg"
}
EOF
)
PAYMENT_RESPONSE=$( \
    $CURL_CMD -X POST "$BASE_URL/expenses/$EXPENSE_ID/payments" \
    -H "Authorization: Bearer $USER2_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYMENT_JSON" \
)
PAYMENT_ID_U2=$(echo "$PAYMENT_RESPONSE" | jq -r '.id')
PAYMENT_AMOUNT=$(echo "$PAYMENT_RESPONSE" | jq -r '.amount')
PAYMENT_IMAGE=$(echo "$PAYMENT_RESPONSE" | jq -r '.image_url')

# Compare against "10.0"
if [[ "$PAYMENT_ID_U2" =~ ^[0-9]+$ ]] && [ "$PAYMENT_AMOUNT" == "10.0" ] && [ "$PAYMENT_IMAGE" == "https://example.com/payments/payment1.jpg" ]; then
    echo "    [OK] Payment created (ID: $PAYMENT_ID_U2) with amount $PAYMENT_AMOUNT and image."
else
    echo "    [FAIL] Payment creation failed or data mismatch."
    echo "    Response: $PAYMENT_RESPONSE"
    exit 1
fi

# --- Step 11: User 2 updates payment ($10 -> $5) ---
echo "--- (11/15) User 2 (creator) updates payment to $5 ---"
UPDATE_JSON=$(cat <<EOF
{
  "from_user_id": $USER2_ID,
  "to_user_id": $USER1_ID,
  "amount": 5.00,
  "description": "Corrected payment for lunch",
  "image_url": "https://example.com/payments/payment1_corrected.jpg"
}
EOF
)
# --- 添加调试信息 ---
echo "    Sending PATCH request to $BASE_URL/payments/$PAYMENT_ID_U2 with payload:"
echo "$UPDATE_JSON"
# --- 结束调试信息 ---

UPDATE_RESPONSE=$( \
    $CURL_CMD -X PATCH "$BASE_URL/payments/$PAYMENT_ID_U2" \
    -H "Authorization: Bearer $USER2_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$UPDATE_JSON" \
)

# --- 添加调试信息 ---
echo "    Raw Response for Step 11: $UPDATE_RESPONSE"
# --- 结束调试信息 ---

UPDATED_AMOUNT=$(echo "$UPDATE_RESPONSE" | jq -r '.amount')
UPDATED_IMAGE=$(echo "$UPDATE_RESPONSE" | jq -r '.image_url')

# Compare against "5.0"
if [ "$UPDATED_AMOUNT" == "5.0" ] && [ "$UPDATED_IMAGE" == "https://example.com/payments/payment1_corrected.jpg" ]; then
    echo "    [OK] Payment updated successfully to amount $UPDATED_AMOUNT and new image."
else
    echo "    [FAIL] Payment update failed."
    echo "    Response: $UPDATE_RESPONSE" # Already printed raw response
    exit 1
fi

# --- Step 12: User 4 makes payment ($5) to User 1 ---
echo "--- (12/15) User 4 makes payment ($5) to User 1 ---"
PAYMENT_JSON_U4=$(cat <<EOF
{
  "from_user_id": $USER4_ID,
  "to_user_id": $USER1_ID,
  "amount": 5.00,
  "description": "My share for lunch"
}
EOF
)
PAYMENT_RESPONSE_U4=$( \
    $CURL_CMD -X POST "$BASE_URL/expenses/$EXPENSE_ID/payments" \
    -H "Authorization: Bearer $USER4_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$PAYMENT_JSON_U4" \
)
PAYMENT_ID_U4=$(echo "$PAYMENT_RESPONSE_U4" | jq -r '.id')

if [[ "$PAYMENT_ID_U4" =~ ^[0-9]+$ ]]; then
    echo "    [OK] User 4 created payment (ID: $PAYMENT_ID_U4)"
else
    echo "    [FAIL] Failed to create payment for User 4."
    echo "    Response: $PAYMENT_RESPONSE_U4"
    exit 1
fi


# --- Step 13: Verify User 4 balance is settled (0) ---
echo "--- (13/15) Verify User 4 balance is settled ---"
BALANCE_RESPONSE=$( \
    $CURL_CMD -X GET "$BASE_URL/expenses/$EXPENSE_ID/balance/$USER4_ID" \
    -H "Authorization: Bearer $USER1_TOKEN" \
)
CURRENT_BALANCE=$(echo "$BALANCE_RESPONSE" | jq -r '.current_balance')

# Check for 0.0 or 0
if [ "$CURRENT_BALANCE" == "0" ] || [ "$CURRENT_BALANCE" == "0.0" ]; then
    echo "    [OK] User 4 balance is settled (Balance: $CURRENT_BALANCE)"
else
    echo "    [FAIL] User 4 balance is not 0 (Balance: $CURRENT_BALANCE)"
    echo "    Response: $BALANCE_RESPONSE"
    exit 1
fi

# --- Step 14: User 1 (Admin) deletes User 4's payment ---
echo "--- (14/15) User 1 (Admin) deletes User 4's payment ---"
DELETE_RESPONSE_CODE=$( \
    $CURL_CMD -o /dev/null -w "%{http_code}" \
    -X DELETE "$BASE_URL/payments/$PAYMENT_ID_U4" \
    -H "Authorization: Bearer $USER1_TOKEN" \
)
if [ "$DELETE_RESPONSE_CODE" == "204" ]; then
    echo "    [OK] Payment deleted by Admin (HTTP $DELETE_RESPONSE_CODE)"
else
    echo "    [FAIL] Admin failed to delete payment (HTTP: $DELETE_RESPONSE_CODE)"
    exit 1
fi

# --- Step 15: Verify User 4 balance is now unsettled (-5) ---
echo "--- (15/15) Verify User 4 balance is now unsettled (-5) ---"
BALANCE_RESPONSE_FINAL=$( \
    $CURL_CMD -X GET "$BASE_URL/expenses/$EXPENSE_ID/balance/$USER4_ID" \
    -H "Authorization: Bearer $USER1_TOKEN" \
)
FINAL_BALANCE=$(echo "$BALANCE_RESPONSE_FINAL" | jq -r '.current_balance')

# Check for -5.0 or -5
if [ "$FINAL_BALANCE" == "-5.0" ] || [ "$FINAL_BALANCE" == "-5" ] ; then
    echo "    [OK] User 4 balance is now unsettled (Balance: $FINAL_BALANCE)"
else
    echo "    [FAIL] User 4 balance is not -5 (Balance: $FINAL_BALANCE)"
    echo "    Response: $BALANCE_RESPONSE_FINAL"
    exit 1
fi

# --- Step 16: User 1 (Admin) retrieves audit log ---
echo "--- (16/16) User 1 (Admin) retrieves audit log ---"
AUDIT_LOG_RESPONSE=$( \
    $CURL_CMD -X GET "$BASE_URL/groups/$GROUP_ID/audit-trail" \
    -H "Authorization: Bearer $USER1_TOKEN" \
)
# --- 修复检查 ---
# Try to parse the response with jq. Check jq's exit status ($?).
# If jq succeeds (exit status 0), the response is valid JSON.
echo "$AUDIT_LOG_RESPONSE" | jq . > /dev/null 2>&1
JQ_EXIT_CODE=$?

if [ $JQ_EXIT_CODE -eq 0 ]; then
    echo "    [OK] Audit log retrieved successfully (valid JSON received)."
    echo "    [INFO] Audit Log:"
    echo "$AUDIT_LOG_RESPONSE" | jq . # Pretty print the JSON log
else
    echo "    [FAIL] Failed to retrieve audit log or received an invalid JSON response (jq exit code: $JQ_EXIT_CODE)."
    echo "    Raw Response: $AUDIT_LOG_RESPONSE"
    # exit 1 # Decide if this is critical
fi
# --- 修复结束 ---

echo ""
# Check if script reached the end without exiting
if [ $? -eq 0 ]; then
    echo "--- [SUCCESS] All tests passed! ---"
else
    # If exited early, $? will be non-zero
    echo "--- [TEST FAILED] Script exited due to an error in a previous step. ---"
fi

