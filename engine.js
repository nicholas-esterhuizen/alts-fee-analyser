function runScenario(fund, openingNAV, grossReturn, currentHWM) {
    const results = {};
    const hwm = currentHWM || openingNAV;
  
    // Step 1: Deduct management fee from opening NAV
    const managementFeeAmount = openingNAV * fund.managementFee;
    const investableNAV = openingNAV - managementFeeAmount;
  
    // Step 2: Apply gross return to investable NAV
    const grossEndingNAV = investableNAV * (1 + grossReturn);
  
    // Step 3: Calculate performance fee
    let performanceFeeAmount = 0;
    let explanations = [];
  
    if (fund.performanceFee === 0) {
      // Traditional ETF — no performance fee logic needed
      explanations.push("This fund charges a flat annual fee only. No performance fee applies regardless of returns.");
  
    } else if (grossEndingNAV <= hwm) {
      // Below high-water mark — no performance fee
      explanations.push(`No performance fee was charged. The fund's ending value of ${fmt(grossEndingNAV)} has not recovered to its previous high-water mark of ${fmt(hwm)}.`);
  
    } else {
      // Above high-water mark — assess performance fee
      const gainAboveHWM = grossEndingNAV - hwm;
      const hurdleAmount = investableNAV * fund.hurdleRate;
      const actualReturn = (grossEndingNAV - investableNAV) / investableNAV;
  
      if (actualReturn <= fund.hurdleRate) {
        // Return did not clear the hurdle
        explanations.push(`The fund returned ${pct(actualReturn)} after the management fee, which did not clear the ${pct(fund.hurdleRate)} hurdle rate. No performance fee was charged.`);
  
      } else {
        // Hurdle cleared — apply correct logic based on hurdle type
        if (fund.hurdleType === "soft") {
          // Soft hurdle with full catch-up: performance fee on entire gain above HWM
          performanceFeeAmount = gainAboveHWM * fund.performanceFee;
          explanations.push(`The ${pct(fund.hurdleRate)} soft hurdle was cleared. With a full catch-up provision, the manager's ${pct(fund.performanceFee)} performance fee applies to all gains above the high-water mark — ${fmt(gainAboveHWM)} in this scenario, resulting in a performance fee of ${fmt(performanceFeeAmount)}.`);
  
        } else if (fund.hurdleType === "hard") {
          // Hard hurdle, no catch-up: performance fee only on gains above the hurdle amount
          const excessAboveHurdle = gainAboveHWM - hurdleAmount;
          if (excessAboveHurdle <= 0) {
            explanations.push(`The fund cleared the high-water mark but gains did not exceed the ${pct(fund.hurdleRate)} hard hurdle threshold. No performance fee was charged.`);
          } else {
            performanceFeeAmount = excessAboveHurdle * fund.performanceFee;
            explanations.push(`The ${pct(fund.hurdleRate)} hard hurdle was cleared. With no catch-up clause, the manager's ${pct(fund.performanceFee)} performance fee applies only to gains above the hurdle amount — ${fmt(excessAboveHurdle)} in this scenario, resulting in a performance fee of ${fmt(performanceFeeAmount)}.`);
          }
        }
      }
    }
  
    // Step 4: Calculate net ending NAV
    const netEndingNAV = grossEndingNAV - performanceFeeAmount;
    const newHWM = Math.max(hwm, netEndingNAV);
    const totalFees = managementFeeAmount + performanceFeeAmount;
    const netReturn = (netEndingNAV - openingNAV) / openingNAV;
  
    return {
      openingNAV,
      managementFeeAmount,
      investableNAV,
      grossEndingNAV,
      performanceFeeAmount,
      netEndingNAV,
      newHWM,
      totalFees,
      netReturn,
      grossReturn,
      explanations
    };
  }
  
  function runMultiYearSequence(fund, openingNAV, yearlyReturns) {
    let currentNAV = openingNAV;
    let currentHWM = openingNAV;
    const yearlyResults = [];
  
    for (let i = 0; i < yearlyReturns.length; i++) {
      const result = runScenario(fund, currentNAV, yearlyReturns[i], currentHWM);
      result.year = i + 1;
      yearlyResults.push(result);
      currentNAV = result.netEndingNAV;
      currentHWM = result.newHWM;
    }
  
    const totalFeesPaid = yearlyResults.reduce((sum, r) => sum + r.totalFees, 0);
    const finalNAV = yearlyResults[yearlyResults.length - 1].netEndingNAV;
    const totalNetReturn = (finalNAV - openingNAV) / openingNAV;
  
    return { yearlyResults, totalFeesPaid, finalNAV, totalNetReturn };
  }
  
  // Formatting helpers
  function fmt(value) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
  }
  
  function pct(value) {
    return (value * 100).toFixed(1) + '%';
  }
  
  // Scenario definitions
  const scenarios = {
    bear:  { label: "Bear",            grossReturn: -0.10, years: 1 },
    base:  { label: "Base",            grossReturn:  0.10, years: 1 },
    bull:  { label: "Bull",            grossReturn:  0.22, years: 1 },
    multi: { label: "Multi-Year",      grossReturn: null,  years: 4,
             yearlyReturns: [-0.08, -0.08, -0.03, 0.25] },
    multiExtended: { label: "Multi-Year (Strong Recovery)",
             grossReturn: null, years: 4,
             yearlyReturns: [-0.08, -0.08, -0.03, 0.50] }
  };