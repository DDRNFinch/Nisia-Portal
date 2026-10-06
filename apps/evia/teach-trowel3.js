/* Teach me: Trowel Occupations Level 3 (NVQ). Units follow the NVQ; each has short lessons (Evia teaches a little,
   you try it, then something new) and a unit challenge with new questions from new angles. */
(function(){
  const {TE,EX,W,CD,Q,T,M,O,G,B,TAP,S,J,SP,N,SC,HOT,LB,QF,TROPHY,lesson,unit,add}=window.EVIA_TEACH;
  const C={challenge:true};
  add("trowel3",[
    unit("Unit 102: Health, safety and welfare","",[
      lesson("t3-1021","Safety law and your duties","Who must do what, and reporting",[
        TE("Duties both ways","The *Health and Safety at Work Act* puts duties on your employer and on you. You must take care of yourself and others, follow training and instructions, and never interfere with safety equipment.",null,"HASAWA"),
        M("Match the law to what it covers",[["HASAWA","General duties of employers and workers"],["RIDDOR","Reporting serious injuries and dangerous occurrences"],["COSHH","Hazardous substances like cement"],["Work at Height Regs","Planning work at height"]],"The main laws on a building site."),
        TE("When things change","Hazards appear as a job moves on: a new trench, a removed handrail, ice. Make it safe if you can, then report it straight away."),
        SC("A new hazard","You come back from break and someone has taken a scaffold board out to pass materials through.","What do you do?",[["Keep off that lift and report it now","Don’t work on it until it’s put right by someone competent."],["Put the board back yourself and carry on","Only competent people alter scaffolds."],["Mention it at the next toolbox talk","Someone could fall before then."]]),
        O("Put responding to an accident in order",["Make the area safe","Get first aid help","Report it to your supervisor","Record it in the accident book"],"Some incidents also need reporting under RIDDOR.")
      ]),
      lesson("t3-1022","Welfare and security","Looking after people and the site",[
        TE("Welfare","CDM says every site needs toilets, washing with hot and cold water, drinking water, somewhere to eat and rest, and somewhere to dry and store clothes."),
        J("Does the site meet welfare rules?",[["Toilets and hand washing with hot water",true,"Required."],["Only a cold tap outside",false,"Washing needs hot and cold water."],["A warm cabin to eat in",true,"Required."],["Drinking water by the mixer, in an old bucket",false,"Drinking water must be clean and marked."]]),
        TE("Security","Sign in and out, wear your ID, lock away tools and materials, and politely challenge or report people you don’t know."),
        S("Welfare or security?",["Welfare","Security"],[["Drying room for wet gear",0,"Looking after people."],["Signing out at night",1,"Knowing who’s on site."],["Locking the tool store",1,"Protects kit."],["Drinking water",0,"Looking after people."]]),
        QF([["Workers have legal duties too",true],["Welfare cabins are optional on small jobs",false],["Unknown visitors should be challenged or reported",true],["You can remove a guard if it slows you down",false]])
      ]),
      lesson("t3-1023","Unit challenge","Health, safety and welfare",[
        TROPHY(6),
        Q("Which law would you check before using a new resin mortar?",["COSHH","RIDDOR","Work at Height Regs","HASAWA only"],"COSHH covers hazardous substances."),
        HOT("Tap the sign that means you must wear eye protection","signs4",[[40,50,30,"Blue circle"],[120,50,30,"Red circle"],[200,50,30,"Yellow triangle"],[280,50,30,"Green square"]],0,"Blue circles are mandatory signs."),
        SP("Ben’s accident report. Tap the mistake.",["Made the area safe","Got the first aider","Waited a week to tell the supervisor","Filled in the accident book"],2,"Report straight away."),
        T("A dangerous occurrence can need reporting under RIDDOR even if nobody was hurt.",true,"Like a scaffold collapse."),
        B("Build the rule","Report hazards straight away",["later","sometimes"],"Before anyone gets hurt.")
      ],C)
    ]),
    unit("Unit 234: Masonry cladding","Masonry cladding",[
      lesson("t3-2341","Cladding a frame","Timber, steel and concrete frames",[
        TE("What cladding is","Brick cladding is a *non-structural* outer leaf. It carries its own weight and is tied back to a frame: timber, steel or concrete.",null,"Cladding"),
        TE("Timber frame","Ties are fixed into the *studs*, not just the sheathing, over a breathable membrane. The timber shrinks as it dries, so leave gaps under sills, at eaves and at openings so the frame doesn’t hang on the brickwork."),
        Q("Why leave gaps under sills on timber frame?",["The frame shrinks and would otherwise sit on the brickwork","To ventilate the roof","To save bricks","For cables"],"Differential movement can crack brickwork or tip sills."),
        EX("Cladding a concrete frame","Tap each part.","supportangle",[[150,96,"Support angle","Steel angle bolted to the slab edge; it carries the brickwork above."],[186,101,"Movement joint","Compressible filler and sealant under the angle, never mortar."],[140,64,"Cavity tray","Sheds water out over the angle."],[140,23,"Tie","Holds the brickwork back to the frame."]]),
        T("The joint under a support angle is filled solid with mortar.",false,"It’s a compressible movement joint, so the frame can’t load the brickwork below.",{again:G("Under a support angle goes a [compressible] movement joint.",["mortar","solid"],"So the frame’s movement doesn’t crush the brickwork.")})
      ]),
      lesson("t3-2342","Fire, information and protection","Barriers, planning and care",[
        TE("Cavity barriers","A cavity is a chimney for fire. *Cavity barriers* close it where the drawings say, such as at floors, party walls and round openings."),
        Q("Where do cavity barriers go?",["Where the drawings require, like at floors and party walls","Only at the bottom of the wall","Anywhere they fit","They aren’t needed with brick"],"Fire must not run up the cavity."),
        M("Match the information to what it gives",[["Drawings","Layout, sizes and details"],["Specification","Materials and standards"],["Schedules","Lists, like ties and lintels"],["Manufacturer’s information","How to fit their product"]],"Use them together."),
        SC("Starting at height","You’re about to start cladding from the second lift.","What do you check first?",[["The scaffold’s been inspected and has edge protection","Access must be safe before you load it."],["That the van is nearby","Not a safety check."],["Only the weather","Weather matters, but check the scaffold first."]]),
        TE("Protecting it","Cover sills and corners, keep mortar off the face and protect finished work from other trades.","protect")
      ]),
      lesson("t3-2343","Unit challenge","Masonry cladding",[
        TROPHY(6),
        HOT("Tap what carries the brickwork above","supportangle",[[150,96,12,"Steel angle"],[186,101,10,"Soft joint"],[140,23,12,"Thin wire"],[60,79,14,"Concrete slab"]],0,"The support angle carries it; the slab carries the angle."),
        Q("On timber frame, what must ties be fixed into?",["The studs","Just the sheathing","The membrane","The insulation"],"Sheathing alone won’t hold them."),
        SP("Mia’s cladding. Tap the mistake.",["Ties fixed into the studs","Gap left under the sills","Mortar packed under the support angle","Cavity barriers at each floor"],2,"That joint must be compressible."),
        T("Brick cladding holds up the frame.",false,"It’s non-structural: the frame holds it."),
        Q("A schedule tells you…",["Lists of items, like how many ties and lintels","How to mix mortar","The programme","Who to report to"],"Schedules list repeated items."),
        B("Build the rule","Fix ties into the studs",["sheathing","membrane"],"On timber frame.")
      ],C)
    ]),
    unit("Unit 235: Masonry structures","Masonry structures",[
      lesson("t3-2351","Walls and openings","To the drawings and specification",[
        TE("To specification","Build to the drawings: bond, gauge, tie spacing, clean cavities, trays and DPCs in the right places. The spec decides the bond and joint finish, not you."),
        EX("An opening","Tap each part.","opening",[[160,40,"Lintel","Carries the wall over the opening."],[124,128,"Bearing","At least 150 mm each end."],[160,112,"Sill","Brick-on-edge, throws water off."],[130,32,"Weep hole","Lets water out from the tray."]]),
        Q("What decides the joint finish on a job?",["The specification","Your preference","The weather","Whatever’s quickest"],"Work to the contract information."),
        TE("Tops of walls","Copings and cappings shed water: a DPC underneath and drips that throw water clear.","coping"),
        LB("Label the coping","coping",[[160,34,110,50,"Coping"],[160,52,266,55,"DPC"],[115,50,46,54,"Drip"]],"Coping on top, DPC under it, drips under the overhang.")
      ]),
      lesson("t3-2352","Quality, time and resources","Checking as you go",[
        O("Put a quality check in order",["Gauge and level with the gauge rod","Plumb and line","Bond and perps","Joint finish and cleanliness"],"Check as you go so errors don’t grow."),
        TE("Behind time?","Tell your supervisor early. An early warning lets the programme change; a late one just means a missed date."),
        SC("Running late","You’re a day behind on a stair core wall.","What do you do?",[["Tell your supervisor now and talk through options","Early warning helps everyone."],["Speed up and skip the checks","Quality drops and faults cost more."],["Say nothing and hope","The next trades will be held up."]]),
        S("Which resource is it?",["Materials","Components","Plant"],[["Facing bricks",0,"Materials."],["Lintels",1,"Components."],["Wall ties",1,"Components."],["Forklift",2,"Plant."],["Mortar",0,"Materials."]]),
        T("Small tolerance errors can stay if the next trade will cover them.",false,"Work to the specified tolerances.")
      ]),
      lesson("t3-2353","Unit challenge","Masonry structures",[
        TROPHY(6),
        Q("A lintel over a 1.2 m opening needs at least what bearing each end?",["150 mm","50 mm","100 mm","300 mm"],"150 mm minimum, or as the drawing says."),
        HOT("Tap where water gets out above the lintel","opening",[[130,32,8,"Small slot"],[160,112,14,"Sill"],[160,80,14,"Opening"],[60,60,14,"Wall"]],0,"Weep holes let the tray drain."),
        SP("Tom’s wall. Tap the mistake.",["Checked gauge with the rod","Kept the cavity clean","Changed the joint finish because it’s quicker","Laid the tray over the lintel"],2,"The spec decides the finish."),
        G("Copings have a [DPC] under them and [drips] under the overhang.",["tie","lintel"],"Keeps water out of the wall."),
        T("Tell your supervisor early if you’re falling behind.",true,"The programme can then change."),
        B("Build the rule","Work to the specification",["guess","quickest"],"Not your own preference.")
      ],C)
    ]),
    unit("Unit 300: Planning work and resources","Planning work",[
      lesson("t3-3001","Programmes","Sequence, lead times and dependencies",[
        TE("A programme","A programme, often a *bar chart*, shows when each activity happens and which ones must finish before others start.","gantt","Programme"),
        Q("When can walls to DPC start?",["Week 4, after the foundations","Week 1","Week 2","Week 6"],"Foundations run weeks 2 and 3.",{pic:"gantt"}),
        M("Match the term",[["Lead time","How long materials take to arrive"],["Dependency","One task must finish before another"],["Critical path","Tasks that delay the job if they slip"],["Programme","The timeline of activities"]],"Planning words."),
        TE("Lead times","Special bricks can take weeks. Order early enough that they arrive before you need them."),
        Q("Specials have a 6-week lead time and are needed in week 8. Order by…",["Week 2","Week 7","Week 8","Week 10"],"8 − 6 = 2.",{again:T("With a 6-week lead time, ordering the day before is fine.",false,"Order at least 6 weeks ahead.")})
      ]),
      lesson("t3-3002","When things change","Clarifying, adapting and reporting",[
        O("Put planning a job in order",["Read the drawings and spec","List the activities","Work out resources for each","Set the sequence and timings","Check it against the programme"],"Good plans prevent delays."),
        SC("A change","The specified blocks can’t be delivered for three weeks.","What do you do?",[["Ask for approved alternatives before using anything else","They must meet the spec and be approved."],["Use any similar block","It might not meet the spec."],["Stop work for good","Look for a solution."]]),
        TE("Other trades","If another trade holds you up, tell your supervisor and suggest a way to re-sequence, with reasons."),
        J("Good ways to handle a change?",[["Report it with a suggested solution",true,"Helps decisions."],["Argue with the other trade",false,"Go through your supervisor."],["Give reasons and evidence for a programme change",true,"Decision makers need to know why."],["Keep quiet and build round it",false,"Causes bigger problems later."]]),
        T("Weather is an external factor that can affect a programme.",true,"Rain and frost can stop bricklaying.")
      ]),
      lesson("t3-3003","Unit challenge","Planning work",[
        TROPHY(5),
        Q("On the chart, how many weeks does the superstructure take?",["4","3","5","8"],"Weeks 5 to 8.",{pic:"gantt"}),
        T("Tasks on the critical path can slip without delaying the job.",false,"That’s exactly what the critical path can’t do."),
        SP("Ali’s plan. Tap the mistake.",["Listed every activity","Worked out labour and plant","Ordered specials the week they’re needed","Checked it against the programme"],2,"Allow for the lead time."),
        N(["Read the drawings","List the activities","Work out resources"],["Set the sequence and timings","Start bricklaying","Order the skip"],"Sequence comes next."),
        B("Build the rule","Order specials early",["late","never"],"Lead times can be weeks.")
      ],C)
    ]),
    unit("Unit 303: Methods of work",["Methods of work","Drawings and information"],[
      lesson("t3-3031","Getting the right information","Drawings, specs and scales",[
        TE("Scales","On a *1:50* drawing, 1 mm on paper is 50 mm on site. Multiply what you measure by the scale.",null,"Scale"),
        Q("On a 1:50 drawing a pier is 9 mm wide. How wide is it really?",["450 mm","90 mm","45 mm","900 mm"],"9 × 50 = 450 mm.",{again:Q("On a 1:20 drawing, 20 mm is really…",["400 mm","200 mm","40 mm","2,000 mm"],"20 × 20 = 400 mm.")}),
        TE("Is it current?","Always use the latest *revision*. Check the letter and date in the title block."),
        SC("Unclear detail","The cavity tray detail on the drawing doesn’t match the spec.","What do you do?",[["Ask the supervisor to get it clarified before building","Guessing can be costly to undo."],["Build the one you prefer","It might be wrong."],["Leave the tray out","Water will get in."]]),
        M("Where would you look?",[["Building Regulations","Legal minimum standards"],["British Standards","How things should be done"],["Manufacturer","How to fit a product"],["Site manager","Project questions"]],"Sources beyond the drawings.")
      ]),
      lesson("t3-3032","Choosing a method","Safety, quality, time and cost",[
        TE("Weighing methods","Compare methods on *safety, quality, time and cost*, and what the contract and regulations require. Then share the chosen method, often with a method statement and briefing."),
        S("Which factor is this?",["Safety","Quality","Time","Cost"],[["Will it meet the spec?",1,"Quality."],["Can it be done without undue risk?",0,"Safety."],["Does it fit the programme?",2,"Time."],["Is it the best use of resources?",3,"Cost."]]),
        T("The cheapest method is always the best.",false,"It must also be safe, meet the spec and fit the programme."),
        Q("How is a chosen method best shared?",["A method statement and a briefing","A text to one person","A note on the skip","It isn’t"],"Everyone should know the method and why.")
      ]),
      lesson("t3-3033","Unit challenge","Methods of work",[
        TROPHY(5),
        Q("On a 1:100 plan a wall measures 45 mm. How long is it?",["4.5 m","45 m","450 mm","0.45 m"],"45 × 100 = 4,500 mm."),
        SP("Jo’s start. Tap the mistake.",["Checked the revision letter","Read the method statement","Used last month’s drawing because it was handy","Asked about an unclear detail"],2,"Always use the latest revision."),
        M("Match the question to the factor",[["Is anyone at risk?","Safety"],["Will it pass inspection?","Quality"],["Will we finish on time?","Time"]],"Weigh them all."),
        T("Manufacturer’s instructions tell you how to install their product.",true,"Follow them."),
        B("Build the rule","Check the latest revision",["old","any"],"Before building.")
      ],C)
    ]),
    unit("Unit 313: Architectural and decorative",["Arches","Chimneys and fireplaces","Decorative work","Curved and splayed walls"],[
      lesson("t3-3131","Arches","Parts, types and turning an arch",[
        EX("A segmental arch","Tap each part.","arch",[[160,49,"Key","The centre voussoir at the crown."],[210,60,"Voussoir","A wedge-shaped unit of the arch."],[50,90,"Springing line","Where the arch starts."],[120,70,"Intrados","The inside curve (soffit)."],[122,42,"Extrados","The outside curve."],[239,81,"Skewback","The sloping face the arch springs from."]]),
        LB("Label the arch","arch",[[160,49,160,20,"Key"],[160,76,196,76,"Rise"],[160,132,160,144,"Span"]],"Rise is springing to soffit; span is the opening width."),
        TE("Arch types","*Rough ringed*: uncut bricks, wedge-shaped joints. *Axed*: bricks cut to a taper. *Gauged*: rubbed bricks with very fine joints. A *segmental* arch is part of a circle, less than a semicircle."),
        M("Match the arch",[["Rough ringed","Uncut bricks, wedge joints"],["Axed","Bricks cut to a taper"],["Gauged","Rubbed bricks, fine joints"],["Semicircular","Rise is half the span"]],"Types by how they’re made and shaped."),
        O("Put turning an arch in order",["Set out the springing points","Fix the centre","Mark the voussoirs on the centre","Lay from both sides to the key","Strike the centre once the mortar’s hard"],"Work evenly from both sides.")
      ]),
      lesson("t3-3132","Chimneys and fireplaces","Stacks, flues and hearths",[
        EX("A chimney stack","Tap each part.","chimney",[[161,10,"Pot","Finishes the flue at the top."],[188,25,"Flaunching","Sloped mortar that sheds water and holds the pot."],[127,34,"Oversailing course","Projects to throw water off the stack."],[152,58,"Flue liner","Inside the stack; carries the smoke."],[176,76,"Stepped flashing","Lead tucked into the joints, over the roof."]]),
        TE("Flue liners","Lay liners *sockets up*, joints sealed and the flue clean. Condensation then runs down inside instead of out through the joints."),
        Q("Why are flue liners laid sockets up?",["Condensation runs down inside, not out at the joints","It’s quicker","They look better","It doesn’t matter"],"Keeps tar and moisture in the flue."),
        TE("Fireplaces","A *constructional hearth* (at least 125 mm thick) protects the floor. Fire bricks line the fire, and the *gather* narrows the smoke into the flue."),
        M("Match the part",[["Hearth","Protects the floor"],["Gather","Narrows smoke into the flue"],["Flashing","Seals the stack to the roof"],["Flue liner","Carries the smoke"]],"Each part has one job.")
      ]),
      lesson("t3-3133","Decorative features","Corbels, plinths, strings and dentils",[
        EX("Decorative courses","Tap each one.","decor",[[60,27,"Dentil course","Alternate headers project, like teeth."],[100,72,"String course","A band across the wall, often a contrasting brick."],[240,98,"Plinth course","A bevelled course where the wall steps back."]]),
        TE("Corbels","A *corbel* steps courses out from the face. Keep each step to about a quarter brick (56 mm), and the total no more than the wall’s thickness.","corbel"),
        Q("A one-brick wall (215 mm). What’s the most a corbel should project in total?",["215 mm","56 mm","300 mm","450 mm"],"No more than the wall thickness.",{again:T("Each corbel course can step out half a brick.",false,"About a quarter brick (56 mm) per course.")}),
        HOT("Tap the dentil course","decor",[[60,27,10,"Top band"],[100,72,12,"Middle band"],[240,98,12,"Bottom band"]],0,"Alternate headers project."),
        TE("Setting out","Set out panels and patterns from the *centre* so the design is symmetrical and cuts are equal at each end. Order specials early: long lead times.")
      ]),
      lesson("t3-3134","Curved and splayed walls","Trammels, headers and squints",[
        TE("Curved on plan","Set out the centre and use a *trammel* (radius rod) to check every course. On tight curves use *headers* so joints stay small.","curved","Trammel"),
        HOT("Tap the trammel","curved",[[185,83,12,"Rod"],[160,140,8,"Peg"],[102,35,12,"Wall"]],0,"It swings from the centre peg."),
        Q("Why headers on a tight curve?",["Shorter units follow the curve without wide joints","They’re cheaper","They’re stronger","Tradition"],"Stretchers leave wide joints on tight curves."),
        TE("Splays","Walls meeting at angles other than 90° use *squint* specials or cut bricks, keeping the bond right on both faces."),
        T("A wall curved in elevation needs a template to check its shape.",true,"The template matches the curve on the drawing.")
      ]),
      lesson("t3-3135","Unit challenge","Architectural and decorative",[
        TROPHY(8),
        HOT("Tap the key","arch",[[160,49,10,"Crown"],[110,60,10,"Side"],[239,81,10,"End"],[160,76,10,"Middle"]],0,"The centre voussoir."),
        Q("A span of 1.2 m. How high is a semicircular arch’s rise?",["600 mm","1.2 m","300 mm","400 mm"],"Half the span."),
        SP("Kim’s arch. Tap the mistake.",["Set out the springings","Fixed the centre","Laid all the voussoirs from one side","Struck the centre once hard"],2,"Work evenly from both sides."),
        HOT("Tap what seals the stack to the roof","chimney",[[176,76,10,"Lead"],[140,24,10,"Mortar"],[161,12,10,"Pot"],[225,110,16,"Roof"]],0,"Stepped flashing."),
        T("Flue liners are laid sockets down.",false,"Sockets up."),
        Q("What checks each course of a curved wall?",["A trammel from the centre","A straight edge","The level alone","Eye"],"Radius rod."),
        G("A corbel steps out about a [quarter] brick per course.",["half","whole"],"56 mm."),
        B("Build the rule","Set out patterns from the centre",["end","corner"],"For symmetry.")
      ],C)
    ]),
    unit("Unit 502: Working relationships","Working relationships",[
      lesson("t3-5021","Communicating well","Clear, early and respectful",[
        TE("Good communication","Give clear, accurate information at the right time, to the right person. Offer help, encourage questions and respect other trades and the client.","team"),
        M("Match the situation to a good response",[["Another trade asks about your work","Explain clearly and politely"],["An urgent safety issue","Tell the right person now"],["A client’s question","Answer or pass to the site manager"],["A lost new starter","Offer help and invite questions"]],"Right message, right person."),
        SC("A change","You need to move a lintel position that affects the joiner’s frames.","What’s best?",[["Tell the joiner early and in person, then confirm","Early, clear and confirmed."],["Leave a note on their tools","It may be missed."],["Tell them after it’s built","Too late to plan."]]),
        T("Encouraging questions helps avoid mistakes.",true,"People check more when they feel welcome to ask.")
      ]),
      lesson("t3-5022","Disagreements","Keeping trust and respect",[
        O("Put resolving a disagreement in order",["Listen to their view","Explain yours calmly with reasons","Look for options that meet the spec","Agree a way forward or involve the supervisor"],"Aim for an outcome everyone accepts."),
        SC("A complaint","The plasterer says your reveals aren’t plumb.","What’s best?",[["Check them together and put right anything out","Keeps goodwill and quality."],["Argue they’re fine","Check first."],["Blame the bricks","Doesn’t fix anything."]]),
        J("Good or bad for working relationships?",[["Focusing on the work, not the person",true,"Keeps it calm."],["Winning the argument at any cost",false,"Damages trust."],["Involving the supervisor if you can’t agree",true,"The right escalation."],["Walking off mid-conversation",false,"Disrespectful."]]),
        T("If you can’t agree, involve your supervisor.",true,"That’s the right next step.")
      ]),
      lesson("t3-5023","Unit challenge","Working relationships",[
        TROPHY(5),
        SP("Dan’s handover. Tap the mistake.",["Told the joiner about the change early","Explained the reason","Shouted at the plumber for being late","Confirmed the change by message"],2,"Stay calm and respectful."),
        Q("A client asks when you’ll finish their extension. You’re not sure. What do you say?",["I’ll check with the site manager and get back to you","Next week, probably","Not my job","Ignore them"],"Don’t guess: pass it on."),
        N(["Listen to their view","Explain yours calmly"],["Look for options that meet the spec","Walk away","Tell the client"],"Then find a solution."),
        T("Giving too much detail is always better than too little.",false,"Match the detail to the person and the urgency."),
        B("Build the rule","Listen first then explain",["shout","ignore"],"Resolving disagreements.")
      ],C)
    ]),
    unit("Unit 701: Setting out","Setting out",[
      lesson("t3-7011","Setting out a building","Datums, profiles and square",[
        TE("Levels","All levels come from the site *datum* or a *temporary bench mark* (TBM), transferred with an optical or laser level.",null,"TBM"),
        EX("Setting out in plan","Tap each part.","profiles",[[34,35,"Profile board","Holds the building line, set back clear of the dig."],[260,35,"Building line","Strung between profiles."],[160,70,"Diagonals","Equal diagonals mean the rectangle is square."],[130,100,"Trench","The foundation dig, between the lines."],[300,120,"TBM","The known level everything is taken from."]]),
        TE("Square corners","Check with *3-4-5*, or measure both diagonals: if they’re equal, it’s square.","square345"),
        Q("A rectangle is 8 m by 6 m. What should each diagonal be?",["10 m","14 m","12 m","9 m"],"6-8-10 is double 3-4-5.",{again:T("If a rectangle’s diagonals are equal, it’s square.",true,"Unequal diagonals mean it’s out of square.")}),
        O("Put setting out in order",["Check the drawings and datum","Set out the main building line","Set out right angles and check diagonals","Fix profiles clear of the dig","Check everything again"],"Check twice, dig once.")
      ]),
      lesson("t3-7012","Angles, curves and openings","Batters, trammels and gauge rods",[
        M("Match the task to the kit",[["Curve on plan","Trammel from a centre point"],["Sloping (battered) wall","Batter board or frame"],["Opening heights","Gauge rod"],["Other angles","Template or instrument"]],"Right tool for the shape."),
        TE("Gauge rod","A gauge rod marks every course (75 mm) plus sill and lintel heights, so openings land on course.","gaugerod"),
        HOT("Tap the lintel bearing mark","gaugerod",[[162,26,10,"Top mark"],[162,71,10,"Middle mark"],[150,116,10,"Bottom"]],0,"Lintel bearing at the top, sill below."),
        T("Setting out mistakes are cheap to fix once walls are up.",false,"Cheapest to fix before anything’s built.")
      ]),
      lesson("t3-7013","Unit challenge","Setting out",[
        TROPHY(6),
        HOT("Tap the profile board","profiles",[[34,35,8,"Board"],[160,70,10,"Crossing lines"],[300,120,8,"Peg"],[130,100,8,"Trench"]],0,"Set back clear of the dig."),
        Q("Diagonals measure 10.00 m and 10.08 m. What does that tell you?",["It’s out of square","It’s square","It’s level","Nothing"],"Diagonals must be equal."),
        SP("Lee’s setting out. Tap the mistake.",["Took levels from the TBM","Checked diagonals","Fixed profiles right on the trench edge","Rechecked before digging"],2,"The dig would disturb them."),
        Q("A 3-4-5 triangle scaled up by 2 has sides of…",["6, 8 and 10","5, 6 and 7","3, 4 and 10","6, 8 and 12"],"Double each side."),
        T("A trammel sets out curves from a centre point.",true,"A radius rod."),
        B("Build the rule","Check diagonals are equal",["longer","shorter"],"For a square rectangle.")
      ],C)
    ]),
    unit("Unit 238: Thin joint masonry","Masonry structures",[
      lesson("t3-2381","Thin joint systems","Blocks, jointing mortar and the first course",[
        EX("Thin joint blockwork","Tap each part.","thinjoint",[[100,102,"First course bed","Normal mortar, set dead level."],[51,56,"Thin joint","2 to 3 mm of jointing mortar."],[268,58,"Scoop","Spreads the jointing mortar evenly."],[180,118,"Foundation","Everything sits on this."]]),
        TE("Level first course","The first course goes on *normal mortar* and must be dead level: 2 to 3 mm joints can’t take up errors."),
        Q("Why must the first course be dead level?",["Thin joints can’t take up errors","It’s quicker","It saves blocks","It doesn’t matter"],"With 2 to 3 mm joints there’s no room to adjust."),
        O("Put building thin joint in order",["Bed the first course level on normal mortar","Mix jointing mortar as specified","Spread it with the scoop","Lay and tap blocks into place","Fit ties and check"],"First course sets the standard."),
        T("Jointing mortar can be mixed however you like.",false,"Follow the maker’s mix and working times.")
      ]),
      lesson("t3-2382","Cutting, openings and safety","Working with aircrete",[
        TE("Cutting","Cut aircrete with a hand saw or band saw, and control the dust: fine dust damages lungs."),
        J("Safe cutting?",[["Dust extraction and a suitable mask",true,"Control the dust."],["Dry cutting with no mask",false,"Fine dust damages lungs."],["A block saw for straight cuts",true,"The right tool."],["Sweeping dust up dry",false,"Vacuum or dampen it."]]),
        M("Match the tool",[["Serrated scoop","Spreads jointing mortar"],["Rubbing float","Takes off high spots"],["Block saw","Cuts aircrete"],["Helical tie","Ties thin joint walls"]],"The thin joint kit."),
        T("Thin joint walls can be built quickly because the mortar sets fast.",true,"A main benefit.")
      ]),
      lesson("t3-2383","Unit challenge","Thin joint masonry",[
        TROPHY(5),
        HOT("Tap the course bedded on normal mortar","thinjoint",[[100,95,12,"Bottom course"],[100,55,12,"Middle course"],[100,25,12,"Top course"]],0,"The first course."),
        Q("How thick is a thin joint?",["2 to 3 mm","10 mm","20 mm","6 mm"],"That’s the name."),
        SP("Sam’s thin joint wall. Tap the mistake.",["First course dead level","Mixed to the maker’s instructions","Used a trowel and 10 mm joints above","Used the scoop"],2,"Use the scoop and thin joints."),
        T("You should dry-sweep aircrete dust.",false,"Vacuum or dampen it."),
        B("Build the rule","Set the first course dead level",["roughly","later"],"Thin joints can’t fix errors.")
      ],C)
    ]),
    unit("Unit 690: Repair and maintenance","Repairs",[
      lesson("t3-6901","Repairing masonry","Repointing, replacing and stitching",[
        TE("Find the cause","Before repairing, find and fix the *cause*: a leaking gutter, a failed DPC, a missing coping. Otherwise it happens again.","defects"),
        HOT("Tap the crumbling joints","defects",[[80,86,16,"Bottom left"],[140,55,16,"White patch"],[240,40,16,"Stepped line"],[54,11,12,"Top corner"]],0,"Eroded joints need repointing."),
        TE("Repointing","Rake out to a sound depth, at least 15 mm, brush out and dampen, then point with a matching mortar and finish.","repoint"),
        O("Put repointing in order",["Rake out to a sound depth","Brush out and dampen","Point with matching mortar","Finish to match","Protect while it cures"],"Match the mortar and finish."),
        M("Match the defect to a repair",[["Eroded joints","Repoint"],["Spalled brick","Replace the brick"],["Stable crack","Stitch as specified"],["Efflorescence","Brush off dry, find the damp"]],"Right repair for the defect.")
      ]),
      lesson("t3-6902","Old buildings and safety","Lime, asbestos and listed buildings",[
        TE("Soft old bricks","Mortar should be *weaker* than the brick. On old soft bricks use lime: hard cement mortar traps moisture and the bricks spall."),
        Q("Why use lime mortar on an old building with soft bricks?",["Hard cement mortar traps moisture and damages the bricks","Lime is quicker","It’s cheaper","It doesn’t matter"],"The joint should give, not the brick."),
        SC("Suspect asbestos","Behind an old flue you find grey fibrous board.","What do you do?",[["Stop, don’t disturb it, tell your supervisor","Only trained or licensed people deal with it."],["Take it out carefully","You could release fibres."],["Hose it down and carry on","Still disturbs it."]]),
        TE("Listed buildings","Listed buildings may need consent before changing materials or methods. Match brick, mortar colour and joint finish."),
        T("Access for repairs must be inspected and suitable for the task.",true,"Scaffolds and towers checked before use.")
      ]),
      lesson("t3-6903","Unit challenge","Repair and maintenance",[
        TROPHY(6),
        Q("What’s the minimum rake-out depth for repointing?",["15 mm","5 mm","50 mm","It doesn’t matter"],"At least 15 mm to a sound face."),
        SP("Ray’s repair. Tap the mistake.",["Found the leaking gutter first","Raked out 15 mm","Repointed old soft bricks in strong cement","Matched the joint finish"],2,"Mortar weaker than the brick."),
        T("Repairing damage without finding the cause is fine.",false,"It will come back."),
        Q("On a listed building, what might you need before changing materials?",["Consent","Nothing","A skip","A new drawing only"],"Protected buildings have rules."),
        HOT("Tap the spalled brick","defects",[[54,11,12,"Top left"],[140,55,16,"White patch"],[240,40,16,"Stepped line"],[80,86,16,"Bottom joints"]],0,"The face has broken away."),
        B("Build the rule","Mortar weaker than the brick",["stronger","harder"],"So the joint gives, not the brick.")
      ],C)
    ]),
    unit("Unit 828: Specialist masonry elements","Masonry cladding",[
      lesson("t3-8281","Support and restraint","Angles, channels, wind posts and starters",[
        TE("Support angles","Support angles carry brickwork off the frame. They’re set level with *shims* and have a compressible movement joint under them.","supportangle"),
        LB("Label the section","supportangle",[[150,96,240,120,"Support angle"],[186,101,260,101,"Movement joint"],[140,64,120,120,"Cavity tray"]],"Tray over, soft joint under."),
        M("Match the element",[["Support angle","Carries brickwork from the frame"],["Channel system","Lets ties line up with courses"],["Wind post","Stiffens long or tall panels"],["Wall starter kit","Ties a new wall to an old one"]],"Specialist fixings."),
        Q("Why use a wall starter kit?",["To tie a new wall to an existing one without toothing in","To start a mixer","To level the first course","For decoration"],"Quicker and less disruptive.")
      ]),
      lesson("t3-8282","Barriers","Vapour, moisture and fire",[
        TE("Barriers","*Vapour control layers* stop moist air getting into the structure. *DPMs and trays* stop water. *Cavity and fire barriers* stop fire spreading. Laps and seals must be continuous."),
        S("What does it stop?",["Moist air","Water","Fire"],[["Vapour control layer",0,"Warm, moist air."],["Cavity tray",1,"Water across the cavity."],["DPM",1,"Rising moisture."],["Cavity barrier",2,"Fire and smoke in the cavity."]]),
        Q("Why must barrier laps be sealed and continuous?",["Gaps let moisture or fire through","It looks neat","It saves material","They don’t need to be"],"Only as good as the weakest joint."),
        T("Fire barriers can be left out if the cavity is narrow.",false,"Fit them wherever required.")
      ]),
      lesson("t3-8283","Unit challenge","Specialist elements",[
        TROPHY(5),
        HOT("Tap the movement joint","supportangle",[[186,101,8,"Under the angle"],[140,64,12,"Sloping line"],[150,96,10,"Steel"],[186,50,12,"Bricks"]],0,"Compressible filler and sealant."),
        Q("What stiffens a long brick panel against wind?",["A wind post","A cavity tray","A DPC","A lintel"],"Steel posts fixed top and bottom."),
        SP("Eve’s cladding. Tap the mistake.",["Shimmed the angle level","Lapped and taped the VCL","Left a gap in the cavity barrier for a pipe","Fitted the tray over the angle"],2,"Barriers must be continuous."),
        T("Channel systems let ties slide to meet the courses.",true,"So ties sit in bed joints."),
        B("Build the rule","Keep barriers continuous",["gappy","optional"],"Seal every lap.")
      ],C)
    ]),
    unit("Unit 837: Drainage","",[
      lesson("t3-8371","Laying drains","Falls, bedding and chambers",[
        TE("Two systems","*Foul* water (toilets, sinks) and *surface* water (rain) usually run in separate drains. Never connect foul to a surface water drain.",null,"Foul water"),
        EX("A drain run","Tap each part.","drain",[[180,103,"Pipe","Laid to a steady fall."],[60,112,"Granular bed","Pea gravel supports the pipe evenly."],[100,78,"Flow","Water runs downhill to the chamber."],[272,60,"Inspection chamber","Access for rodding at bends and junctions."],[120,45,"Backfill","Placed in layers, no big stones on the pipe."]]),
        Q("Where do you need an inspection chamber?",["At changes of direction and junctions","Every metre","Only at the house","Nowhere"],"So every length can be rodded."),
        TE("Falls","A 100 mm drain is typically laid at about *1:40*: 25 mm drop for every metre."),
        Q("A 100 mm drain at 1:40 runs 8 m. How much does it fall?",["200 mm","40 mm","320 mm","80 mm"],"8,000 ÷ 40 = 200 mm.",{again:T("At 1:40, a drain falls 25 mm every metre.",true,"1,000 ÷ 40 = 25.")})
      ]),
      lesson("t3-8372","Testing and trench safety","Checking the drain and staying safe",[
        SC("Before digging","You’re about to dig a drain trench beside the road.","What first?",[["Check service drawings and scan with a cable detector","Hitting a cable or gas main can kill."],["Just dig carefully","You can’t see what’s there."],["Only check the weather","Services matter more."]]),
        TE("Trench safety","Trench sides can collapse without warning. Support them or batter them back, keep spoil and plant back from the edge, and have excavations inspected every shift."),
        O("Put laying a drain in order",["Check drawings, levels and falls","Excavate with trench support","Lay bedding and pipes to the fall","Test the drain","Backfill in layers"],"Test before backfilling."),
        J("Safe trench work?",[["Trench supported before going in",true,"Collapse kills."],["Spoil heaped right at the edge",false,"Keep it back."],["Inspected at the start of each shift",true,"Required."],["Working alone in a deep trench",false,"Someone should be on top."]]),
        T("Drains are tested before backfilling.",true,"Leaks are easy to fix then.")
      ]),
      lesson("t3-8373","Unit challenge","Drainage",[
        TROPHY(6),
        HOT("Tap where you’d rod the drain from","drain",[[272,60,14,"Chamber"],[60,112,12,"Bed"],[120,45,14,"Backfill"],[105,79,12,"Arrow"]],0,"The inspection chamber."),
        Q("A drain at 1:40 falls 150 mm. How long is it?",["6 m","4 m","1.5 m","15 m"],"150 × 40 = 6,000 mm."),
        SP("Nia’s drain. Tap the mistake.",["Scanned for cables first","Bedded pipes on pea gravel","Backfilled, then tested","Put a chamber at the bend"],2,"Test before backfilling."),
        T("Foul water can go into a surface water drain.",false,"It causes pollution."),
        Q("What should pipes be bedded on?",["Granular material like pea gravel","Broken bricks","Topsoil","Nothing"],"Even support."),
        B("Build the rule","Test before you backfill",["after","never"],"Leaks are easy to find.")
      ],C)
    ])
  ]);
})();
