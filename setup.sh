#!/usr/bin/env bash
# One-time setup for the Summit Roofing template on Whop.
# Run from inside the project folder:  bash setup.sh
# Creates the product + 3 prices, writes .env, and stores the server secrets on the app.
set -euo pipefail

ACCOUNT_ID="${ACCOUNT_ID:-biz_b8Jc6cSgrgWDrL}"

# Pulls the first Whop ID with the given prefix out of the CLI's JSON output.
pick_id() {
  node -e '
    const prefixes = process.argv[1].split(",");
    let s = ""; process.stdin.on("data", d => s += d).on("end", () => {
      const m = s.match(new RegExp("\"(" + prefixes.join("|") + ")_[A-Za-z0-9]+\""));
      if (!m) { console.error("Could not find an ID in:\n" + s); process.exit(1); }
      console.log(m[0].slice(1, -1));
    });' "$1"
}

echo "1/5  Installing Whop Payment Elements..."
pnpm add @whop/elements@^1.10.0 @whop/elements-react@^1.10.0 >/dev/null

echo "2/5  Creating the product..."
PRODUCT_ID=$(whop products create --account_id "$ACCOUNT_ID" \
  --title "Summit Roofing Services" \
  --description "Roof inspections, flat-rate repairs, and project deposits." \
  --format json | pick_id prod)
echo "     product: $PRODUCT_ID"

make_price() { # title price
  whop variants create --account_id "$ACCOUNT_ID" --product_id "$PRODUCT_ID" \
    --title "$1" --billing_type one_time --initial_price "$2" --currency usd --unlimited_stock \
    --format json | pick_id plan,var,variant
}

echo "3/5  Creating the three prices..."
PLAN_INSPECTION=$(make_price "Roof Inspection" 149)
PLAN_FLAT_RATE=$(make_price "Flat-Rate Shingle Repair" 450)
PLAN_DEPOSIT=$(make_price "Project Deposit" 500)
echo "     inspection: $PLAN_INSPECTION"
echo "     flat-rate:  $PLAN_FLAT_RATE"
echo "     deposit:    $PLAN_DEPOSIT"

echo "4/5  Writing .env (public IDs only)..."
cat > .env <<EOF
VITE_WHOP_ENVIRONMENT=production
VITE_WHOP_COMPANY_ID=$ACCOUNT_ID
VITE_WHOP_PLAN_INSPECTION=$PLAN_INSPECTION
VITE_WHOP_PLAN_FLAT_RATE=$PLAN_FLAT_RATE
VITE_WHOP_PLAN_DEPOSIT=$PLAN_DEPOSIT
EOF

echo "5/5  Saving server secrets on the app..."
echo
echo "     Paste your business API key (Dashboard > Developer > API keys)."
echo "     Nothing will show while you paste. That's normal. Then press Enter."
read -r -s ROOFING_API_KEY
echo
if [ -z "$ROOFING_API_KEY" ]; then echo "No key entered. Re-run: bash setup.sh"; exit 1; fi
ADMIN_TOKEN=$(node -e 'console.log(require("crypto").randomBytes(18).toString("base64url"))')

whop apps secrets set \
  --secret "ROOFING_API_KEY=$ROOFING_API_KEY" \
  --secret "WHOP_COMPANY_ID=$ACCOUNT_ID" \
  --secret "ROOFING_PRODUCT_ID=$PRODUCT_ID" \
  --secret "ADMIN_TOKEN=$ADMIN_TOKEN" >/dev/null

echo
echo "Done."
echo "Your /admin password (save it in Notes, don't show it on stream):"
echo
echo "    $ADMIN_TOKEN"
echo
echo "Next:  whop apps deploy"
