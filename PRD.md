# Product Requirements Document
## Alts Fee Analyser — v1

**Status:** Approved  
**Author:** Nicholas Esterhuizen  
**Last updated:** May 2026  
**Repository:** github.com/nicholas-esterhuizen/alts-fee-analyser

---

## Problem Statement

A retail investor exploring alternative investments for the first time has no intuitive way to understand what complex fee structures actually cost them across different performance scenarios — or whether those fees are justified by the returns. Sometimes they are. The tool is designed to show both sides of that answer clearly.

They can read a fund's fee terms on paper — management fee, performance fee, hurdle rate, high-water mark, catch-up clause — but they cannot visualise how these mechanics interact over time, especially across loss years and recovery years. The gap between gross return and net return is invisible until it is modelled explicitly.

---

## Target User

A self-directed retail investor who:

- Already holds a traditional portfolio of stocks and ETFs (the "core" in a core/satellite portfolio construction framework)
- Is considering an alternatives allocation as a satellite position — seeking diversification, differentiated return streams, or exposure to asset classes, sectors, or areas of strategic interest unavailable through traditional markets
- Has enough financial literacy to understand that fees erode returns, but is not familiar with the mechanics of alternatives fee structures
- Is doing pre-commitment research and wants to make an informed decision, not just a hopeful one

This user is not a professional investor. They do not have access to Bloomberg or institutional due diligence tools. They are capable of understanding a clearly explained output but should not be required to interpret raw numbers without context.

---

## What the Tool Does

The Alts Fee Analyser allows a user to input a notional investment amount and evaluate the true net cost of allocating to alternative funds across multiple performance scenarios. It compares those outcomes directly against traditional ETF benchmarks, making the cost of the alternatives satellite visible and comparable.

**Important:** The four funds pre-loaded in v1 are a starting dataset for proof of concept — not the product's identity or its ceiling. The architecture is explicitly designed so that adding funds requires only a data entry in `data.js`, with no changes to the calculation engine or UI. The long-term vision is a fully dynamic platform that pulls live fund data via API and provides scenario-based analysis across any alternatives fund a user wants to evaluate.

---

## Fund Dataset — v1

### Traditional ETFs (Baseline)

| Fund | Full Name | Type | Annual Fee | Performance Fee |
|---|---|---|---|---|
| SPY | SPDR S&P 500 ETF Trust | Passive ETF | 0.09% TER | None |
| DIA | SPDR Dow Jones Industrial Average ETF | Passive ETF | 0.16% TER | None |

These funds represent the investor's existing core portfolio. They serve as the benchmark against which the cost of the alternatives satellite is evaluated.

### Alternative Funds

| Fund | Full Name | Type | Mgmt Fee | Perf Fee | Hurdle | HWM | Catch-Up |
|---|---|---|---|---|---|---|---|
| BXPE | Blackstone Private Equity Strategies | Private Equity Evergreen | 2.2% total* | 12.5% | 5% soft | Yes | Full |
| AQR SP | AQR Style Premia Alternative Fund | Liquid Alternatives (Quant) | 1.5% | 20% | 8% hard | Yes | None |

*BXPE total annual cost: 1.25% management fee + 0.10% AIFM fee + 0.85% servicing fee = 2.2%

**Terminology embedded in the UI:**
- **TER (Total Expense Ratio):** The flat annual fee charged by a fund, expressed as a percentage of assets. Deducted regardless of performance.
- **Management fee:** The annual fee charged by an alternatives fund manager for running the fund. Charged on opening NAV regardless of performance.
- **Performance fee (incentive fee):** A fee charged only when the fund generates returns above a defined threshold. Rewards the manager for outperformance.
- **Hurdle rate:** The minimum return the fund must achieve before a performance fee can be charged. A soft hurdle means the fee applies to all gains once the hurdle is cleared. A hard hurdle means the fee applies only to gains *above* the hurdle.
- **High-water mark (HWM):** The highest NAV the fund has previously reached. Performance fees can only be charged on gains above this level — protecting investors from paying twice on the same ground.
- **Catch-up clause:** After the investor receives their preferred return (hurdle), the manager receives a disproportionate share of subsequent profits until they have "caught up" to their target percentage of total profits.

---

## Fee Calculation Engine — Validated Logic

All fee logic has been validated manually against CAIA curriculum source material prior to implementation.

### Management Fee (all funds)
Applied to **opening NAV** at the start of each year. The investor does not earn returns on this amount for the year.

```
investable_NAV = opening_NAV - (opening_NAV × management_fee_rate)
```

### Gross Return
Applied to investable NAV after management fee deduction.

```
gross_ending_NAV = investable_NAV × (1 + gross_return_rate)
```

### Performance Fee — SPY and DIA
None. No performance fee logic required.

### Performance Fee — BXPE (soft hurdle, full catch-up)

```
IF gross_ending_NAV > high_water_mark AND return > 5% hurdle:
    gain_above_HWM = gross_ending_NAV - high_water_mark
    performance_fee = gain_above_HWM × 12.5%
ELSE:
    performance_fee = 0

net_ending_NAV = gross_ending_NAV - performance_fee
high_water_mark = MAX(high_water_mark, net_ending_NAV)
```

The full catch-up provision means the manager's 12.5% applies to the entire gain above the high-water mark once the soft hurdle is cleared — not just the excess above the hurdle. This is the defining characteristic of a soft hurdle with full catch-up, and is what distinguishes BXPE from a hard hurdle structure.

### Performance Fee — AQR Style Premia (hard hurdle, no catch-up)

```
IF gross_ending_NAV > high_water_mark AND return > 8% hurdle:
    hurdle_amount = investable_NAV × 8%
    gain_above_HWM = gross_ending_NAV - high_water_mark
    excess_above_hurdle = gain_above_HWM - hurdle_amount
    performance_fee = excess_above_hurdle × 20%
ELSE:
    performance_fee = 0

net_ending_NAV = gross_ending_NAV - performance_fee
high_water_mark = MAX(high_water_mark, net_ending_NAV)
```

The hard hurdle means the performance fee applies only to gains *above* the hurdle amount, not the full gain above the high-water mark. There is no catch-up, so the manager never earns on the hurdle portion of profits.

---

## Scenarios

### Single-Year Scenarios

| Scenario | Gross Annual Return | Purpose |
|---|---|---|
| Bear | -10% | Shows management fees charged on a losing fund. No performance fees triggered. Illustrates the fixed cost drag of alternatives even in bad years. |
| Base | +10% | Performance fees triggered where hurdle is cleared. Shows divergence between ETF and alts net returns at moderate performance. |
| Bull | +22% | Full fee structures activated across both alt funds. Clearest demonstration of fee drag at high returns — and where fees may well be justified by the net return delivered. |

### Multi-Year Sequence Scenario

This is the centrepiece scenario. It demonstrates high-water mark protection, catch-up clause mechanics, and the impact of management fee drag across loss years on the recovery timeline.

| Year | Gross Return |
|---|---|
| Year 1 | -8% |
| Year 2 | -8% |
| Year 3 | -3% |
| Year 4 | +25% |
| Year 4 (extended) | +50% |

**What this scenario surfaces:**
- Management fees compound against the investor during loss years — the hole is deeper than the gross loss alone
- The high-water mark blocks performance fees in Year 4 at +25% for both alt funds, because neither recovers to its original NAV after three years of losses and management fees
- At +50% in Year 4, both alt funds clear the high-water mark and performance fees fire — but produce meaningfully different net outcomes due to their different fee structures
- AQR produces a better net outcome at +50% despite a higher performance fee percentage (20% vs 12.5%), because its lower management fee (1.5% vs 2.2%) preserved more capital during the loss years, and its hard hurdle means the performance fee base is smaller

This counterintuitive result — higher performance fee percentage, better net outcome — is the core insight the tool is designed to surface. It also illustrates that fees are not inherently bad: in the Bull scenario, both alt funds may justify their fee structures through the net returns they deliver relative to the ETF baseline.

---

## Outputs

### Results Table
Fund names across the top. Scenarios down the side. Each cell displays:
- Net return (%)
- Net ending NAV ($)
- Total fees paid ($)

Colour coding: green where an alt fund outperforms the SPY baseline net of fees. Red where it does not.

### Fee Breakdown Panel
For the selected fund and scenario: a year-by-year breakdown showing:
- Opening NAV
- Management fee paid
- Gross ending NAV
- Performance fee paid (if any)
- Net ending NAV
- High-water mark status

### Dynamic Plain-English Explanations
The engine checks which mechanics fired in each scenario and surfaces only the relevant explanation. Examples:

- *"No performance fee was charged — the fund did not recover to its previous high-water mark."*
- *"The catch-up clause fired: BXPE's manager received 12.5% of all gains above the high-water mark once the 5% soft hurdle was cleared."*
- *"AQR's hard hurdle limited the performance fee base to gains above 8% — the manager earned nothing on the first 8% of return."*
- *"Despite a higher performance fee rate, AQR produced a better net outcome. Lower management fees during the loss years preserved more capital."*
- *"In this scenario, BXPE's fees are justified — the net return delivered to the investor still exceeds the ETF baseline by [X]%."*

Explanations are generated dynamically. A mechanic that did not fire in a given scenario produces no explanation for that scenario.

---

## File Architecture

```
alts-fee-analyser/
├── index.html       ← UI, layout, user inputs, results rendering
├── data.js          ← Fund profiles dataset (adding a fund = adding a data entry here only)
├── engine.js        ← Fee calculation logic, scenario runner, explanation generator
└── README.md        ← Project overview, PM framing, instructions
```

---

## Explicit Exclusions — v1

- No tax treatment
- No reinvestment modelling
- No currency conversion (USD only)
- No user-defined fund inputs
- No correlation or diversification analysis (v2 roadmap)
- No backend, no API, no live data
- No data persistence — session only

---

## Roadmap

### v2
- Correlation and diversification analysis: inverse correlation to traditional ETFs, sector access narrative
- User-defined fund input: enter any fund's fee terms and run the same scenarios
- European UCITS/AIF fund profiles
- Clawback clause modelling
- Portfolio-level blended fee analysis: model an entire core/satellite allocation, not just individual funds

### v3 — Platform Vision
A fully dynamic platform that pulls live alternative fund data via API, analyses fee structures automatically using current data, and delivers scenario-based recommendations tailored to the user's portfolio objectives, sector interests, and risk tolerance. The goal: institutional-grade alternatives due diligence, accessible to any self-directed investor. What currently takes an analyst hours to model manually, available in seconds — with plain-English outputs that make the decision clear.

---

## Illustrative Framing

All outputs are explicitly illustrative. This tool is not financial advice. Fund data is based on publicly available information and is pre-loaded for demonstration purposes. Return scenarios are hypothetical. Users should consult a qualified financial adviser before making any investment decision.

This framing must be visible in the UI at all times — not buried in a footer disclaimer, but present as a contextual note adjacent to the results.

---

## Success Criteria

- Fee calculations match manual verification for all four funds across all scenarios
- The multi-year sequence scenario correctly withholds performance fees until the high-water mark is cleared
- A first-time user can understand why their net return differs from gross return without reading a separate glossary
- Every fee term is defined inline or via tooltip on first use
- Adding a fifth fund to the dataset requires no changes to `engine.js` or `index.html`
- The tool is live at github.com/nicholas-esterhuizen/alts-fee-analyser and renders correctly on mobile and desktop