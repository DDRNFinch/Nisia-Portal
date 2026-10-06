/* Teach me: Maths, Functional Skills Level 2, one lesson per area, with site examples. No off-the-job time.
   Each lesson teaches a little, lets you try it, teaches the next bit, then finishes with a quick challenge. */
(function(){
  const {TE,W,CD,Q,T,M,O,G,B,TAP,S,J,SP,N,SC,HOT,LB,QF,CHAL,lesson,unit}=window.EVIA_TEACH,fs={fs:"maths"};
  window.EVIA_TEACH.fs.push(
    unit("Number","",[
      lesson("m2-num","Number and calculations","Order of operations, estimating and negatives",[
        TE("Order of operations","Work out *brackets* first, then powers, then *× and ÷*, then *+ and −*. So 3 + 4 × 5 = 3 + 20 = 23, not 35.",null,"BIDMAS"),
        Q("What is 6 + 3 × 4?",["18","36","13","24"],"Multiply first: 3 × 4 = 12, then 6 + 12 = 18.",{again:Q("What is (6 + 3) × 4?",["36","18","27","24"],"Brackets first: 9 × 4 = 36.")}),
        O("Put these in the order you work them out",["Brackets","Powers","× and ÷","+ and −"],"BIDMAS."),
        TE("Estimate to check","Round to easy numbers to check an answer is sensible. 48 × 21 is about 50 × 20 = 1,000, so 1,008 looks right and 10,080 doesn’t."),
        Q("Roughly, what is 198 × 52?",["About 10,000","About 1,000","About 100,000","About 5,000"],"200 × 50 = 10,000."),
        TE("Negative numbers","Temperatures and levels below datum go negative. Count across zero on a number line.","numline"),
        Q("It’s −2 °C at 7am and 9 °C at noon. How much has it warmed up?",["11 °C","7 °C","9 °C","−11 °C"],"−2 up to 0 is 2, then 9 more: 11.",{pic:"numline"}),
        CHAL(),
        Q("A pallet holds 400 bricks. A wall needs 2,650. How many pallets must you order?",["7","6","6.6","8"],"2,650 ÷ 400 = 6.6, so 7 pallets."),
        T("−5 + 8 = 3",true,"Start at −5 and count up 8.")
      ]),
      lesson("m2-fdp","Fractions, decimals and percentages","Switching between them and working them out",[
        TE("Three ways to say it","½ = 0.5 = 50%. ¼ = 0.25 = 25%. ⅒ = 0.1 = 10%. To turn a percentage into a decimal, divide by 100.","fdp"),
        M("Match the ones that are equal",[["½","50%"],["¼","0.25"],["¾","75%"],["⅒","0.1"]],"Same amount, different form."),
        TE("Percentages of amounts","Find 10% by dividing by 10, then build up. 15% = 10% + 5%."),
        Q("What is 15% of 200?",["30","15","20","300"],"10% is 20, 5% is 10, so 30.",{again:Q("What is 35% of 60?",["21","35","18","24"],"10% is 6: 3 × 6 + 3 = 21.")}),
        TE("Fractions of amounts","Divide by the bottom, times by the top. ⅗ of 45 = 45 ÷ 5 × 3 = 27."),
        G("⅗ of 45 m: 45 ÷ [5] = 9, then 9 × [3] = 27 m.",["9","45"],"Divide by the bottom, times by the top."),
        CHAL(),
        Q("A £240 tool is reduced by 25%. What’s the sale price?",["£180","£215","£60","£200"],"25% of 240 is 60: 240 − 60 = £180."),
        Q("Which is biggest?",["0.7","⅔","65%","0.65"],"⅔ ≈ 0.667, so 0.7."),
        T("Adding 10% then taking 10% off gets you back where you started.",false,"100 → 110 → 99.")
      ]),
      lesson("m2-ratio","Ratio and proportion","Sharing, scaling and best buys",[
        TE("Ratio","A ratio compares amounts. *1:4* cement to sand means 5 parts in all: 1 cement and 4 sand.","ratio","Ratio"),
        TE("Sharing in a ratio","Share 30 buckets in *1:5*. Add the parts: 1 + 5 = 6. One part is 30 ÷ 6 = 5. Sand is 5 parts: 5 × 5 = *25*."),
        Q("Share 24 buckets in the ratio 1:3. How much sand (the 3)?",["18","6","8","21"],"4 parts; 24 ÷ 4 = 6 each; 3 × 6 = 18."),
        TE("Unitary method","Find the value of *one*, then multiply. 4 m costs £18, so 1 m is £4.50."),
        Q("4 m of skirting costs £18. How much for 10 m?",["£45","£40","£72","£28"],"£4.50 × 10 = £45."),
        S("Direct or inverse?",["Direct","Inverse"],[["More metres, more cost",0,"Both go up together."],["More workers, fewer days",1,"One up, one down."],["More bags, more weight",0,"Both up."],["Faster van, shorter journey",1,"One up, one down."]]),
        CHAL(),
        Q("Which is the best buy for screws?",["200 for £9","100 for £5","50 for £2.60","25 for £1.40"],"Per 100: £4.50, £5.00, £5.20, £5.60."),
        T("If 3 people take 6 days, 6 people take 12 days.",false,"Inverse: about 3 days.")
      ]),
      lesson("m2-money","Money and financial calculations","Pay, VAT, budgets and overtime",[
        TE("Money","Show pounds to two decimal places: £4.5 is *£4.50*. Check totals against an estimate."),
        Q("37.5 hours at £12.40 an hour. What’s the pay before deductions?",["£465.00","£446.40","£480.00","£372.00"],"37.5 × 12.40 = 465."),
        TE("VAT","VAT is *20%*. To add it, multiply by 1.2. To take it off a total, divide by 1.2."),
        Q("Materials cost £150 before VAT. What’s the total?",["£180","£170","£150.20","£120"],"150 × 1.2 = £180.",{again:Q("£300 before VAT. With VAT?",["£360","£320","£306","£600"],"300 × 1.2 = 360.")}),
        SP("Kai’s VAT working. Tap the mistake.",["Total with VAT: £96","£96 is 120% of the price","Take off 20% of £96: £76.80","So the price was £76.80"],2,"Divide by 1.2: 96 ÷ 1.2 = £80."),
        O("Put checking a quote in order",["Read what’s included","Add up the costs","Add VAT if it isn’t included","Compare with your budget"],"Know what you’re paying for first."),
        CHAL(),
        Q("Overtime is time and a half on £12 an hour. What’s the overtime rate?",["£18","£13.50","£24","£6"],"1.5 × 12 = 18."),
        QF([["£4.5 should be written £4.50",true],["VAT is 20%",true],["To remove VAT, take off 20%",false],["Double time on £12 is £24",true]])
      ])
    ],fs),
    unit("Measures, shape and space","",[
      lesson("m2-measure","Measures and units","Metric units, converting and time",[
        TE("Metric units","*1,000 mm = 1 m*, 1,000 m = 1 km. 1,000 g = 1 kg, 1,000 kg = 1 tonne. 1,000 ml = 1 litre.","tape"),
        M("Match the equal amounts",[["2.5 m","2,500 mm"],["1.2 kg","1,200 g"],["750 ml","0.75 litres"],["3 tonnes","3,000 kg"]],"Times or divide by 1,000."),
        Q("A bag of cement is 25 kg. How many bags make 1 tonne?",["40","25","400","4"],"1,000 ÷ 25 = 40."),
        TE("Time","Work out time differences in steps: to the next hour, then whole hours, then the rest. Take off breaks."),
        Q("07:45 to 16:15 with a 30-minute break. Working time?",["8 hours","8½ hours","9 hours","7½ hours"],"8½ hours minus 30 minutes.",{again:Q("08:00 to 15:30 with a 45-minute break?",["6¾ hours","7½ hours","7 hours","6½ hours"],"7½ − ¾ = 6¾.")}),
        CHAL(),
        Q("Three 850 mm lengths from a 3 m board. How much is left?",["450 mm","550 mm","2,150 mm","150 mm"],"3,000 − 2,550 = 450 (ignoring saw cuts)."),
        T("Each saw cut (kerf) takes a little off, so allow for it.",true,"A few mm per cut adds up.")
      ]),
      lesson("m2-shape","Shape, space and angles","Angles, right angles and shapes",[
        TE("Angles","A right angle is *90°*. On a straight line angles add to 180°. In a triangle they add to *180°*; in a four-sided shape, 360°."),
        Q("Find the missing angle",["55°","65°","45°","125°"],"180 − 90 − 35 = 55°.",{pic:"triangle",again:Q("A triangle has angles of 60° and 70°. The third?",["50°","60°","70°","130°"],"180 − 130 = 50.")}),
        TE("3-4-5","A triangle with sides 3, 4 and 5 has a right angle. Builders use it to check corners are square.","square345"),
        Q("Sides of 6 m and 8 m should give a diagonal of…",["10 m","12 m","14 m","9 m"],"Double 3-4-5."),
        M("Match the shape to its property",[["Square","4 equal sides, 4 right angles"],["Rectangle","Opposite sides equal, 4 right angles"],["Equilateral triangle","3 equal sides and angles"],["Circle","Every point the same distance from the centre"]],"Shape facts."),
        CHAL(),
        Q("Three angles of a four-sided shape are 90°, 90° and 100°. The fourth?",["80°","90°","100°","170°"],"360 − 280 = 80."),
        T("A rectangle’s diagonals are the same length.",true,"That’s how builders check square.")
      ]),
      lesson("m2-apv","Area, perimeter and volume","Rooms, walls, concrete and circles",[
        TE("Perimeter and area","*Perimeter* is the distance round the edge. *Area* is length × width, in m². This 4 m by 3 m room has a perimeter of 14 m and an area of 12 m².","area","Area"),
        Q("A room is 5 m by 4 m. How much skirting for the perimeter?",["18 m","20 m","9 m","40 m"],"5 + 4 + 5 + 4 = 18 m."),
        Q("A 6 m × 2.5 m wall has a 1 m × 2 m door. What area needs building?",["13 m²","15 m²","17 m²","10 m²"],"15 − 2 = 13 m²."),
        TE("Volume","Volume is length × width × depth, in m³.","trench","Volume"),
        B("Build the rule for volume","volume = length × width × depth",["+","area"],"Three measurements multiplied."),
        TE("Circles","Area of a circle = *π × r²*. π is about 3.14."),
        CHAL(),
        Q("A 2 m radius circle. About how much area?",["12.6 m²","6.3 m²","4 m²","25.1 m²"],"3.14 × 2 × 2 ≈ 12.6."),
        T("Doubling a floor’s length and width doubles its area.",false,"It makes it four times bigger.")
      ]),
      lesson("m2-scale","Scale and drawings","Reading scales, plans and elevations",[
        TE("Scale","*1:50* means 1 mm on the drawing is 50 mm for real. Site drawings are often 1:50, 1:20 or 1:100.",null,"Scale"),
        Q("On a 1:50 drawing a wall measures 80 mm. How long is it?",["4 m","400 mm","40 m","1.6 m"],"80 × 50 = 4,000 mm."),
        TE("Going the other way","To draw something, *divide* the real size by the scale: 3,000 mm at 1:20 is 150 mm."),
        Q("A 3 m opening drawn at 1:20 measures…",["150 mm","60 mm","300 mm","15 mm"],"3,000 ÷ 20 = 150.",{again:Q("A 5 m wall at 1:100 measures…",["50 mm","500 mm","5 mm","20 mm"],"5,000 ÷ 100.")}),
        M("Match the view",[["Plan","Looking down from above"],["Elevation","Looking straight at a side"],["Section","A slice through"],["Detail","A small part drawn larger"]],"Types of drawing."),
        T("Use a written dimension rather than measuring the drawing.",true,"Printed drawings can be scaled or copied wrongly.")
      ])
    ],fs),
    unit("Handling data","",[
      lesson("m2-data","Data, charts and graphs","Bar charts, pie charts and line graphs",[
        TE("Read the chart first","Check the *title*, the *axes* and the *scale* before reading a value.","bars"),
        Q("How many deliveries on Thursday?",["8","6","5","3"],"Read across from the top of the bar.",{pic:"bars"}),
        M("Match the chart to what it’s best for",[["Line graph","Change over time"],["Bar chart","Comparing amounts"],["Pie chart","Parts of a whole"],["Table","Exact values"]],"Pick the right chart."),
        TE("Pie charts","A whole pie is *360°*. Half is 180°, a quarter 90°.","pie"),
        Q("Half the waste is timber. What angle is its slice?",["180°","90°","50°","360°"],"Half of 360.",{pic:"pie"}),
        CHAL(),
        Q("A bar stops halfway between 20 and 25. Its value?",["22.5","22","25","21"],"Halfway."),
        T("An axis that doesn’t start at zero can make small differences look big.",true,"Always check the scale.")
      ]),
      lesson("m2-avg","Averages and range","Mean, median, mode and range",[
        CD("The four measures",[["Mean","Mean","Add them up, divide by how many"],["Median","Median","The middle value in order"],["Mode","Mode","The most common"],["Range","Range","Biggest minus smallest"]]),
        TE("Using the chart","Deliveries: 3, 5, 3, 8, 6. Add them: 25. Five days, so the *mean* is 5.","bars"),
        Q("What’s the mode of the deliveries?",["3","5","8","6"],"3 appears twice.",{pic:"bars"}),
        Q("What’s the range?",["5","8","3","25"],"8 − 3 = 5.",{pic:"bars"}),
        TE("Median","Put the values *in order* first, then find the middle."),
        Q("Find the median of 12, 4, 9, 7, 15.",["9","7","12","47"],"4, 7, 9, 12, 15.",{again:Q("Median of 6, 2, 10?",["6","2","10","18"],"2, 6, 10.")}),
        CHAL(),
        Q("Hours: 6, 8, 7, 9, 5. What’s the mean?",["7","8","6","35"],"35 ÷ 5 = 7."),
        T("One very large value changes the median more than the mean.",false,"The mean is pulled; the median barely moves.")
      ]),
      lesson("m2-prob","Probability","How likely something is",[
        TE("The scale","Probability goes from *0* (impossible) to *1* (certain). It can be a fraction, decimal or percentage.","probline"),
        O("Put these from least to most likely",["Impossible","Unlikely","Even chance","Likely","Certain"],"0 to 1."),
        TE("Working it out","Probability = ways it can happen ÷ all possible outcomes."),
        Q("3 faulty and 17 good hinges. Chance of picking a faulty one?",["3/20","3/17","17/20","1/3"],"3 out of 20.",{again:Q("5 red and 15 blue plugs. Chance of red?",["1/4","1/3","5/15","3/4"],"5 out of 20 = 1/4.")}),
        Q("The chance of rain is 30%. The chance of no rain?",["70%","30%","60%","100%"],"They add to 100%."),
        CHAL(),
        T("After 3 heads in a row, tails is more likely.",false,"Still 50:50."),
        Q("A dice. Chance of a number above 4?",["1/3","1/2","1/6","2/3"],"5 or 6: 2 out of 6.")
      ])
    ],fs),
    unit("Algebra and problem solving","",[
      lesson("m2-alg","Formulae and algebra","Using and rearranging formulae",[
        TE("Using a formula","A formula is a rule with letters for numbers. Put the numbers in and work it out. Area of a rectangle: *A = l × w*."),
        Q("Cost = £45 × days + £30. The cost for 4 days?",["£210","£300","£180","£79"],"45 × 4 + 30.",{again:Q("Same formula, 2 days?",["£120","£150","£90","£77"],"90 + 30.")}),
        TE("Solving","Do the same to both sides. 3x + 5 = 20: take 5, then divide by 3."),
        G("3x + 5 = 20. Take 5 from both sides: 3x = [15]. Divide by 3: x = [5].",["25","3"],"Then check: 3 × 5 + 5 = 20."),
        Q("If 2x − 4 = 10, x is…",["7","3","12","14"],"2x = 14, x = 7."),
        Q("A = l × w. Area 24 m², length 6 m. Width?",["4 m","18 m","30 m","144 m"],"w = A ÷ l."),
        CHAL(),
        Q("Bricks = 60 × area. How many for 8.5 m²?",["510","480","85","600"],"60 × 8.5."),
        T("2a + 3a simplifies to 5a.",true,"Like terms add.")
      ]),
      lesson("m2-solve","Problem solving","Multi-step problems on site",[
        TE("A method","Read it twice. Pick out what you *know* and what you *need*. Do one step at a time, show working, then check it makes sense."),
        O("Put the steps in order",["Read carefully","Pick out what you know and need","Work it out step by step","Check it makes sense"],"Working gets marks even if a sum slips."),
        TE("Posts and gaps","Posts at both ends means one more post than gaps.","posts"),
        Q("A 4.8 m run with posts every 1.2 m, both ends. How many posts?",["5","4","6","8"],"4 gaps, 5 posts.",{again:Q("6 m with posts every 1.5 m, both ends?",["5","4","6","9"],"4 gaps, 5 posts.")}),
        TE("Round up to buy","If you need part of a pack, you buy the whole pack."),
        Q("Boards: packs of 6 at £42. You need 20 boards. Cost?",["£168","£140","£126","£210"],"4 packs × £42."),
        CHAL(),
        Q("40 miles per gallon. A 150-mile round trip uses…",["3.75 gallons","4 gallons","3 gallons","190 gallons"],"150 ÷ 40."),
        SP("Ella’s order. Tap the mistake.",["Needs 20 boards","6 in a pack","20 ÷ 6 = 3.33","So order 3 packs"],3,"Round up to 4.")
      ])
    ],fs)
  );
})();
