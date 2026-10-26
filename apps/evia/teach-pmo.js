/* Teach me: Property Maintenance Operative (ST0171 v1.1). Each unit has two short lessons (Evia teaches a little, you
   try it, then something new) and a unit challenge with new questions from new angles. Facts are UK: the Health and
   Safety at Work Act, COSHH, the Work at Height Regulations, the Electricity at Work Regulations and safe isolation,
   ACoP L8 and HSG274 (legionella), BS 5266 (emergency lighting), BS 5839 (fire alarms), the Building Safety Act 2022,
   the Environmental Protection Act 1990, UK GDPR and the Equality Act 2010. */
(function(){
  const {TE,W,CD,Q,T,M,O,G,B,TAP,S,J,SP,N,SC,QF,CHAL,TROPHY,lesson,unit,add}=window.EVIA_TEACH;
  const C={challenge:true};
  add("pmo",[
    unit("Safe working and planning",["Planning and safety","Access equipment"],[
      lesson("pm-safe1","Planned and reactive work","PPM, job sheets and planning a visit",[
        TE("Two kinds of maintenance","*Planned preventative maintenance* (PPM) is done on a schedule to stop faults: servicing, testing and checks. *Reactive* maintenance is fixing things after they break or a resident reports them.",null,"PPM or reactive"),
        S("Planned or reactive?",["Planned (PPM)","Reactive"],[["Monthly emergency lighting test",0,"It’s on a schedule."],["A burst pipe in a kitchen",1,"It’s already broken."],["Annual gutter clearing",0,"Done every year to stop problems."],["A resident’s door won’t lock",1,"Reported as a fault."],["Flushing little-used taps weekly",0,"A scheduled check."],["A broken window after a storm",1,"Damage that needs fixing now."]]),
        T("Good PPM means fewer emergency call-outs.",true,"Catching problems early stops small faults becoming big ones."),
        TE("Read the job sheet first","Before you set off, read the *job sheet*: the address, the fault, the priority, how to get in, and any notes about the resident, like a disability or a dog. Then pack the tools and spares to *finish first time*.",null,"The job sheet"),
        O("Put a repair visit in order",["Read the job sheet and plan","Load the tools and spares you need","Introduce yourself and show your ID","Check the risk assessment and protect the area","Do the repair and test it","Tidy up, explain to the resident and record the job"],"Plan, prepare, do, check, finish."),
        Q("Why plan the order of work on a job with two repairs?",["To keep things like the water off for as short a time as possible","So you can leave early","It doesn’t matter","To use more materials"],"Good planning keeps disruption for the resident to a minimum."),
        QF([["PPM stops faults before they happen",true],["You don’t need to read the job sheet",false],["Showing your ID helps residents trust you",true],["Reactive work is done on a fixed schedule",false]])
      ]),
      lesson("pm-safe2","Staying safe","The law, risk assessments and access equipment",[
        TE("The law","The *Health and Safety at Work etc. Act 1974* puts duties on your employer and on you: work safely, use the equipment provided and don’t put others at risk. *COSHH* covers hazardous substances like cleaning chemicals, solvents and dust.",null,"Health and safety law"),
        M("Match the regulation to what it covers",[["COSHH","Hazardous substances like chemicals and dust"],["Work at Height Regulations","Ladders, steps and roofs"],["Manual Handling Regulations","Lifting and carrying"],["PPE Regulations","Gloves, boots, eye protection and more"]],"Each set of rules has its job."),
        TE("Risk assessments","A *risk assessment* lists the hazards, who could be harmed and how the risk is controlled. Read it before you start and add anything specific to this job, like a resident with young children.","area","Risk assessment"),
        TE("Ladders and steps","Use a ladder or steps only for short, light jobs. Check it before use, set a leaning ladder at *1 out for every 4 up* (about 75°), keep *three points of contact* and never overreach."),
        G("A leaning ladder is set [1] out for every [4] up.",["2","3"],"About 75°."),
        SC("Your supervisor","There’s a ceiling light to change in a resident’s hallway.","What do you use?",[["A checked step ladder, fully open and locked, with the area kept clear","Right kit, checked and set up properly."],["A kitchen chair","Chairs aren’t access equipment."],["Stand on the banister","Never: it’s a fall from height."]]),
        SP("Mo’s set-up. Tap the mistake.",["Read the risk assessment","Put dust sheets down","Left his toolbox in the doorway","Kept the resident’s child away from the work"],2,"A toolbox in a doorway is a trip hazard for everyone."),
        QF([["Check a ladder before every use",true],["Overreaching from a ladder is fine for a moment",false],["COSHH covers chemicals",true],["Risk assessments only matter on big jobs",false]])
      ]),
      lesson("pm-safe3","Unit challenge","Planning and safe working",[
        TROPHY(6),
        Q("Which law puts a general duty on you to work safely and not endanger others?",["The Health and Safety at Work etc. Act 1974","The Equality Act 2010","The Environmental Protection Act 1990","The Data Protection Act 2018"],"It covers everyone at work."),
        N(["Read the job sheet","Pack the tools and spares"],["Introduce yourself and show your ID","Start the repair straight away","Ask the resident to find the tools"],"Introduce yourself first so the resident knows who you are."),
        T("You should keep a resident’s pets and children away from your work area.",true,"Tools, chemicals and open work are dangerous to them."),
        J("Safe or not safe?",[["Dust sheets down before starting",true,"Protects the home and stops slips."],["A leaning ladder at 45°",false,"Too shallow: it can slide out."],["Cables trailing across a hallway",false,"A trip hazard."],["Barrier round an open floor hatch",true,"Stops falls."]],["Safe","Not safe"]),
        Q("A job needs you to work above a stairwell. What’s right?",["Stop and get suitable access equipment planned","Lean out from the top step","Stand on the handrail","Do it quickly"],"Work at height needs the right equipment and planning."),
        B("Build the ladder rule","One out for every four up",["two","six"],"About 75°.")
      ],C)
    ]),
    unit("Electrics and emergency systems",["Safe isolation","Emergency systems"],[
      lesson("pm-elec1","Electrics and safe isolation","Components, isolation and proving dead",[
        CD("Electrical parts",[["Consumer unit","Consumer unit","Where the supply splits into circuits, each with a breaker."],["MCB","MCB","A breaker that trips if a circuit is overloaded or shorts."],["RCD","RCD","Trips in a fraction of a second if current leaks to earth, protecting people."],["Fused spur","Fused spur","A switched outlet with a fuse, for a fixed appliance."]]),
        TE("Safe isolation","Before working on anything electrical: *switch off* the circuit, *lock it off* with your own lock and a label, and keep the key. Then *prove it dead*.",null,"Isolate and lock off"),
        O("Put proving dead in order",["Prove your voltage indicator works on a proving unit","Test at the point of work","Prove the voltage indicator again"],"Prove, test, prove: so a broken tester can’t fool you."),
        T("Turning off a light switch makes the circuit safe to work on.",false,"A switch may not break every conductor. Isolate at the consumer unit and prove dead."),
        Q("Why keep the key to your lock-off?",["So nobody can switch the circuit back on while you work","So you don’t lose it","It’s company policy only","You don’t need to"],"You control the isolation, so you stay safe."),
        TE("Know your limits","You can isolate, change like-for-like parts if you’re trained and authorised, and *report* faults. Anything else, like scorch marks, a tripping RCD or damaged wiring, goes to a qualified electrician."),
        QF([["Prove dead before and after testing",true],["A tripping RCD is a fault to report",true],["You can rewire a circuit if you watch a video",false],["Lock off with your own lock",true]])
      ]),
      lesson("pm-elec2","Emergency systems","Emergency lighting, fire alarms and fire doors",[
        TE("Emergency lighting","Lights escape routes in a power cut. Test it *monthly* with a short flick test, and *once a year* for its full duration (usually 3 hours). Record every test in the logbook.","signs4","Emergency lighting"),
        M("Match the check to how often",[["Emergency lighting flick test","Monthly"],["Emergency lighting full duration test","Yearly"],["Fire alarm call point test","Weekly"],["Communal fire doors in blocks over 11 m","Every 3 months"]],"Planned checks keep life-safety kit working."),
        TE("Fire doors","A fire door holds back fire and smoke for a set time, like *FD30* for 30 minutes. It must *close fully onto its latch*, with its seals and closer working. Never wedge one open.",null,"Fire doors"),
        J("Is this fire door OK?",[["Closes fully onto the latch on its own",true,"That’s what it should do."],["Wedged open with a fire extinguisher",false,"It can’t stop fire and smoke."],["Intumescent strip missing",false,"Report it: it won’t seal in a fire."],["Gaps even round the edges",true,"Even gaps let the seals work."]],["OK","Report it"]),
        Q("A resident says the alarm sounds when someone cooks. What do you do?",["Report it so the detector type and position can be checked","Take the battery out","Cover the detector","Ignore it"],"Never disable a detector: report it."),
        TE("Extinguishers","Red is water (wood, paper), cream is foam (liquids), black is CO2 (electrical), blue is powder. Check they’re in place, pinned and in date.","extinguishers"),
        QF([["Wedging a fire door open is fine on hot days",false],["Record emergency lighting tests in the logbook",true],["CO2 extinguishers have a black band",true],["Fire alarm call points are tested weekly",true]])
      ]),
      lesson("pm-elec3","Unit challenge","Electrics and emergency systems",[
        TROPHY(6),
        SP("Lee’s isolation. Tap the mistake.",["Switched off the MCB","Locked it off with his own lock","Tested the circuit once and started work","Kept the key in his pocket"],2,"He didn’t prove the tester before and after."),
        Q("What does an RCD protect against?",["Electric shock from current leaking to earth","Burst pipes","Low water pressure","Draughts"],"It trips very fast to protect people."),
        T("You should report a scorch mark on a socket rather than fix it yourself.",true,"That needs a qualified electrician."),
        N(["Isolate at the consumer unit","Lock off and label"],["Prove dead with a tested voltage indicator","Start work","Remove the lock"],"Prove dead before touching anything."),
        Q("An emergency light stays dark during the monthly test. What next?",["Record it and report it for repair","Ignore it until the yearly test","Remove it","Paint over it"],"A failed light leaves an escape route dark."),
        B("Build the testing rule","Prove test prove",["switch","guess"],"Prove the tester, test, prove it again.")
      ],C)
    ]),
    unit("Plumbing repairs","Plumbing repairs",[
      lesson("pm-plumb1","Taps, valves and isolating","How the system works and how to make it safe",[
        CD("Plumbing parts",[["Stop tap","Stop tap","Turns off the cold water to the whole property, often under the kitchen sink."],["Service valve","Service valve","Turns off one tap or appliance with a quarter turn."],["Tap washer","Tap washer","A rubber disc in a traditional tap. Worn, it drips."],["Ceramic cartridge","Ceramic cartridge","The valve in a quarter-turn tap. Replace it if the tap drips."]]),
        TE("Isolate and drain down","Before taking anything apart: put the plug in, *isolate* at the service valve (or stop tap), then *open the tap* to drain it down. Only then dismantle.",null,"Isolate and drain"),
        O("Put changing a tap washer in order",["Put the plug in and protect the basin","Isolate at the service valve","Open the tap to drain it","Remove the head and change the washer","Reassemble and turn the water on slowly","Check for leaks"],"Isolate, drain, repair, test."),
        T("A quarter-turn tap uses a ceramic cartridge, not a washer.",true,"Replace the cartridge with the matching one."),
        Q("Why put the plug in before taking a tap apart?",["So small parts can’t fall down the drain","To fill the basin","To test the drain","It isn’t needed"],"Tiny parts are easy to lose."),
        SC("A resident","My toilet keeps running into the pan.","What’s the likely cause?",[["A worn flush valve seal or a faulty fill valve","Water is leaking past or not shutting off."],["A blocked drain","That stops water leaving, not running in."],["The boiler","The boiler doesn’t feed the cistern."]]),
        QF([["Isolate before you dismantle",true],["The stop tap turns off the whole property’s cold water",true],["Turn the water back on quickly after a repair",false],["Check for leaks after every repair",true]])
      ]),
      lesson("pm-plumb2","Water hygiene","Legionella and keeping water healthy",[
        TE("Legionella","Legionella bacteria grow in water between about *20°C and 45°C*, especially where it’s stagnant. Breathing in tiny droplets, like shower spray, can cause Legionnaires’ disease.",null,"Legionella"),
        G("Stored hot water should be kept at [60]°C or above, and cold water below [20]°C.",["40","30"],"Too hot or too cold for legionella to grow."),
        TE("Flush little-used outlets","Taps and showers in empty flats or spare rooms should be *flushed* regularly, usually weekly, so the water doesn’t stagnate. Run them gently to avoid spray."),
        Q("A flat has been empty for a month. What should happen before the new resident moves in?",["Flush the outlets and check temperatures","Nothing","Just clean the taps","Turn the water off"],"Stagnant water can grow legionella."),
        T("Water hygiene checks and records are a legal requirement for landlords.",true,"Under health and safety law, following the ACoP L8 guidance."),
        M("Match the fix to the fault",[["Dripping traditional tap","Replace the washer"],["Dripping quarter-turn tap","Replace the cartridge"],["Slow basin waste","Clear the trap"],["Running toilet","Check the flush and fill valves"]],"Diagnose first, then replace the right part."),
        QF([["Legionella grows best in warm, stagnant water",true],["Shower spray can spread legionella",true],["Hot water stored at 40°C is safest",false],["Little-used taps should be flushed",true]])
      ]),
      lesson("pm-plumb3","Unit challenge","Plumbing repairs and water hygiene",[
        TROPHY(6),
        Q("What should you do first before replacing a tap cartridge?",["Isolate the water and drain the tap","Unscrew the tap body","Turn the boiler off","Remove the basin"],"Make it safe first."),
        SP("Kai’s tap repair. Tap the mistake.",["Put the plug in","Isolated at the service valve","Used a cartridge from a different tap brand that ‘nearly fits’","Checked for leaks after"],2,"Use the matching part from the manufacturer’s information."),
        T("Running a little-used shower at full blast is the best way to flush it.",false,"Run it gently to avoid breathing in spray."),
        Q("Where would you find which replacement part fits?",["The manufacturer’s information or the part number","Guess from the colour","Ask the resident","Any part will do"],"Technical information gets it right first time."),
        N(["Isolate","Drain down","Replace the part"],["Turn the water on slowly and check for leaks","Leave straight away","Remove the isolation valve"],"Always test before you leave."),
        B("Build the hot water rule","Store hot water at sixty degrees",["forty","twenty"],"60°C or above.")
      ],C)
    ]),
    unit("Drainage","Drainage",[
      lesson("pm-drain1","How drains work","Above and below ground drainage",[
        TE("Above and below ground","*Above ground* drainage is the pipes in and on the building: wastes, traps and soil stacks. *Below ground* drainage takes it away through pipes, inspection chambers and gullies to the sewer.","drain","Two parts"),
        CD("Drainage parts",[["Trap","Trap","A water seal under a sink or toilet that stops smells coming back."],["Gully","Gully","An outside drain with a grate that collects water."],["Inspection chamber","Inspection chamber","An access point with a cover for inspecting and rodding."],["Soil stack","Soil stack","The vertical pipe that takes toilet waste down and vents the system."]]),
        T("Poor drainage can cause damp, smells and damage to foundations.",true,"Water and waste must be carried away properly."),
        Q("What stops drain smells coming up through a basin?",["The water seal in the trap","The plug","The overflow","The tap"],"Keep the trap full of water."),
        TE("Finding the blockage","Lift the inspection chamber covers. If one chamber is *full* and the next one downstream is *empty*, the blockage is between them.",null,"Find it first"),
        Q("Chamber 1 is full of water and chamber 2 downstream is empty. Where’s the blockage?",["Between chamber 1 and chamber 2","Before chamber 1","After chamber 2","In the gully"],"Water backs up to the blockage."),
        QF([["Gullies collect water from downpipes and yards",true],["A dry trap can let smells in",true],["Below ground drains include inspection chambers",true],["Drains never affect a building",false]])
      ]),
      lesson("pm-drain2","Clearing blockages","Rodding, hygiene and safe working",[
        TE("Make it safe","An open chamber is a fall hazard. *Barrier it* before you lift the cover and never leave it open and unattended. Wear gloves, eye protection and suitable clothing."),
        O("Put clearing an outside drain in order",["Set up barriers","Put on gloves and eye protection","Clear the gully pot","Lift the covers and find the blockage","Rod it clear, turning clockwise","Flush through and replace the covers","Clean and disinfect your kit"],"Safe, find it, clear it, check it, clean up."),
        T("Turn drain rods anticlockwise.",false,"Clockwise. Anticlockwise can unscrew the rods in the drain."),
        Q("Why wash and disinfect your kit and hands after drain work?",["Drains carry harmful bacteria","To keep tools shiny","It isn’t necessary","To save time"],"Hygiene protects you and others."),
        SC("Your supervisor","This drain blocks every few weeks.","What should you do as well as clearing it?",[["Record it and report it, as it may need a CCTV survey or repair","Repeated blockages have a cause to find."],["Just keep clearing it","It’ll keep coming back."],["Pour bleach down it","That won’t fix a structural problem."]]),
        TE("Record and report","Write down what you found, what caused it and what you did. Recording repeated faults helps fix the *root cause*, not just the symptom."),
        QF([["Never leave an open chamber unattended",true],["Clear drain waste goes in the general bin",false],["Rod in the direction that clears the blockage safely",true],["Recording faults helps stop them recurring",true]])
      ]),
      lesson("pm-drain3","Unit challenge","Drainage",[
        TROPHY(6),
        SP("Ash’s drain job. Tap the mistake.",["Barriered the chamber","Wore gloves and eye protection","Left the chamber open while he went to the van","Disinfected his rods after"],2,"An open chamber must never be left unattended."),
        Q("Which law covers your duty of care for waste?",["The Environmental Protection Act 1990","The Equality Act 2010","The Work at Height Regulations","The Housing Act"],"You’re responsible for waste going to the right place."),
        T("A blocked gully can cause water to back up against a wall and cause damp.",true,"Keep gullies clear."),
        N(["Barrier the area","Find the blockage"],["Rod it clear, turning clockwise","Leave it","Fill the chamber with concrete"],"Clear it once you know where it is."),
        Q("Why record the job on the job sheet or app?",["It leaves a record for future repairs and audits","It isn’t needed","Only for big jobs","To fill time"],"Good records help the next person."),
        B("Build the rodding rule","Always turn rods clockwise",["anticlockwise","never"],"So they don’t unscrew.")
      ],C)
    ]),
    unit("Heating, ventilation and energy","Heating and ventilation",[
      lesson("pm-heat1","Heating systems","Radiators, valves and pressure",[
        CD("Heating parts",[["TRV","TRV","A thermostatic radiator valve controls one room’s temperature."],["Lockshield valve","Lockshield valve","Set to balance the flow so every radiator heats evenly."],["Radiator key","Radiator key","Bleeds trapped air out of a radiator."],["Programmer","Programmer","Sets when the heating and hot water come on."]]),
        TE("Bleeding a radiator","Cold at the top, warm at the bottom? Air is trapped. Turn the heating *off*, let it cool, open the bleed valve with a key until water comes out, then check the boiler *pressure*.",null,"Bleeding"),
        O("Put bleeding a radiator in order",["Turn the heating off and let it cool","Hold a cloth under the bleed valve","Open the valve until water comes out","Close the valve","Check the boiler pressure"],"Bleeding can drop the pressure."),
        T("A radiator that’s cold at the bottom but warm at the top usually has trapped air.",false,"Cold at the top means air. Cold at the bottom often means sludge."),
        Q("The boiler pressure gauge reads 0.3 bar after bleeding. What’s likely?",["The pressure is low and may need topping up, if you’re allowed to","It’s perfect","The boiler is overheating","The gas is off"],"Most systems sit around 1 to 1.5 bar when cold. Follow the manufacturer’s figures."),
        TE("Know your limits","You can bleed and balance radiators and check pressures. Anything on the *gas* side must be done by a *Gas Safe* registered engineer: it’s the law."),
        QF([["TRVs control one room’s temperature",true],["You can repair a gas boiler if you’re careful",false],["Turn the heating off before bleeding",true],["Lockshield valves balance the system",true]])
      ]),
      lesson("pm-heat2","Ventilation and energy","Fans, condensation and saving energy",[
        TE("Ventilation","Kitchens and bathrooms make a lot of moisture. *Extractor fans* remove it; if they’re blocked or broken, you get *condensation* and *black mould*.",null,"Ventilation"),
        Q("A bathroom has black mould on the ceiling. What should you check first?",["That the extractor fan works and is clean","The colour of the paint","The taps","The door lock"],"Poor extraction is a common cause of condensation mould."),
        O("Put cleaning an extractor fan in order",["Isolate the fan electrically","Remove the cover","Clean the cover, grille and filter","Refit and restore the supply","Test it works"],"Isolate first: it’s electrical."),
        TE("Energy management","Controls like *programmers*, *thermostats* and *TRVs* stop energy being wasted. Larger buildings may have a *building management system* (BMS) controlling heating, lighting and ventilation."),
        J("Saves energy or wastes it?",[["TRVs set low in empty rooms",true,"Only heats what’s needed."],["Heating on with windows open",false,"Heat goes straight out."],["Draught-stripping a door",true,"Keeps the heat in."],["Lights left on in empty plant rooms",false,"Wasted energy."]],["Saves","Wastes"]),
        T("Building regulations include rules on ventilation and energy efficiency.",true,"Approved Documents F and L."),
        QF([["Condensation can cause mould",true],["Isolate a fan before cleaning it",true],["A BMS can control heating and lighting",true],["Blocked fans improve ventilation",false]])
      ]),
      lesson("pm-heat3","Unit challenge","Heating, ventilation and energy",[
        TROPHY(6),
        Q("Who can legally work on a gas appliance?",["A Gas Safe registered engineer","Any maintenance operative","The resident","An electrician"],"It’s the law."),
        SP("Zara’s fan repair. Tap the mistake.",["Checked the risk assessment","Opened the fan cover with it still live","Cleaned the filter","Tested it after"],1,"Isolate first: it’s electrical."),
        T("Checking your own work against the job sheet is part of quality.",true,"Inspect it before you hand it back."),
        Q("Why tell the resident how to use their heating controls?",["So they stay warm and save energy and money","It isn’t your job","To fill time","So they don’t call again"],"Good advice is part of good service."),
        N(["Turn the heating off","Bleed the radiator"],["Check the boiler pressure","Turn the heating up full","Remove the radiator"],"Bleeding can lower the pressure."),
        B("Build the gas rule","Gas work needs a Gas Safe engineer",["anyone","electrician"],"Never work on gas yourself.")
      ],C)
    ]),
    unit("Windows, doors and glazing","Doors and windows",[
      lesson("pm-door1","Doors and their defects","Sticking doors, hinges and locks",[
        TE("Parts of a door","A door hangs on *hinges* in a *frame* or lining. The *latch* clicks into the *keep* (strike plate) on the frame. A *closer* pulls it shut.","doors","Door parts"),
        TE("A sticking door","Find where it binds first: look at the gaps. Often it’s *loose hinge screws* letting it drop. Tighten or replace them before you think about planing.","hinges","Find the cause"),
        O("Put fixing a sticking door in order",["Check the gaps to find where it binds","Tighten or replace the hinge screws","Plane only where needed","Seal any bare timber","Check the latch meets the keep"],"Cause first, then the smallest fix."),
        T("Planing a door is always the first fix for sticking.",false,"Check the hinges first. Plane only if you need to, and seal the edge."),
        Q("A door won’t latch shut, but it closes against the stop. What should you adjust?",["The keep on the frame","The hinges","The handle","The threshold"],"The latch has to line up with the keep."),
        SC("A resident","My front door lock is really stiff.","What would you do first?",[["Check the door isn’t dropped and the lock lines up, then lubricate or replace it","Find out why before changing parts."],["Force the key","That can snap it."],["Take the lock off and leave it","The door must be secure."]]),
        QF([["Loose hinge screws can make a door drop",true],["Bare timber should be sealed after planing",true],["The keep is fixed to the door",false],["Fire doors need their closers working",true]])
      ]),
      lesson("pm-door2","Windows and glazing","Defects, safety glass and fire doors",[
        TE("Window defects","Common faults: *misting between panes* (a failed sealed unit), *broken hinges and handles*, *draughts* from worn seals, and *rotten timber* on old sills.","window","Window faults"),
        Q("A double-glazed window has mist between the panes. What’s needed?",["Replace the sealed unit","Clean the outside","Turn the heating down","Paint the frame"],"The seal has failed."),
        TE("Safety glass","Building regulations (Approved Document K) require *safety glass* in critical locations: low-level glazing and in and near doors. Look for the mark etched in the corner.",null,"Safety glass"),
        J("Safety glass needed?",[["A glazed panel in a door",true,"In and near doors is a critical location."],["Low glass beside a door",true,"Low glazing is critical."],["A small high bathroom window",false,"Not usually a critical location."],["Glass in a door side panel",true,"Near doors counts."]],["Needed","Not usually"]),
        TE("Materials","Timber looks good and can be repaired but needs painting. UPVC is low-maintenance but can’t be easily repaired if cracked. Aluminium is strong and slim. Choose replacement parts that match and meet the regulations."),
        T("A fire door’s glazing must be fire-rated glass.",true,"Ordinary glass would fail in a fire."),
        QF([["Misting between panes means a failed seal",true],["Safety glass is needed near doors",true],["UPVC needs painting every year",false],["Worn seals cause draughts",true]])
      ]),
      lesson("pm-door3","Unit challenge","Windows, doors and glazing",[
        TROPHY(6),
        SP("Jo’s door repair. Tap the mistake.",["Checked the gaps","Tightened the hinge screws","Planed the top and left it bare","Checked the latch"],2,"Bare timber takes in moisture and swells. Seal it."),
        Q("Which document sets the rules for safety glass in buildings?",["Approved Document K","Approved Document P","The COSHH regulations","The Equality Act"],"Protection from falling, collision and impact."),
        T("You should explain to the resident in plain words what was wrong with their door.",true,"Plain words, not jargon."),
        N(["Find where the door binds","Tighten the hinges"],["Check it again before planing","Take the door off and leave","Plane all four edges"],"The hinges may have fixed it."),
        Q("A colleague is finishing your job tomorrow. What’s the best handover?",["A clear written note with photos","A quick shout","Nothing","A text with no details"],"Clear records avoid mistakes."),
        B("Build the door rule","Check the hinges before planing",["paint","never"],"Smallest fix first.")
      ],C)
    ]),
    unit("Plastering repairs","Plastering repairs",[
      lesson("pm-plas1","Plaster defects and materials","Cracks, blown plaster and what to use",[
        TE("Plaster defects","Common faults: *cracks*, *blown* plaster (loose and hollow when tapped), *holes* from fixings or knocks, and *damp* staining.","defects","Plaster faults"),
        CD("Plaster materials",[["Backing plaster","Backing plaster","The first coat that builds up thickness, like bonding."],["Finish plaster","Finish plaster","The thin final coat, trowelled smooth."],["Scrim tape","Scrim tape","Mesh over joints and cracks to stop them cracking through."],["Filler","Filler","For small holes and cracks before decorating."]]),
        T("Tapping a wall and hearing a hollow sound can mean the plaster has blown.",true,"It has lost its bond and needs cutting out."),
        Q("Before patching, what do you do with loose plaster?",["Cut it back to a sound edge","Fill over it","Paint it","Wet it and leave it"],"New plaster needs a sound edge."),
        TE("Prepare the background","Brush out the dust, then *prime* or *dampen* the background so the new plaster bonds and doesn’t dry too fast.",null,"Preparation"),
        M("Match the job to the material",[["A deep hole","Backing plaster in layers"],["The final smooth surface","Finish plaster"],["A small nail hole","Filler"],["A crack along a board joint","Scrim tape then plaster"]],"Right material, right job."),
        QF([["Blown plaster sounds hollow",true],["Fill straight over loose plaster",false],["Scrim tape helps stop cracks returning",true],["Prime or dampen before plastering",true]])
      ]),
      lesson("pm-plas2","Patching plaster","Mixing, applying and finishing",[
        TE("Protect first","Plastering is messy. *Dust sheets* down, *mask* nearby surfaces, and keep a clear, tidy area so nobody slips."),
        O("Put patching a hole in order",["Protect the area","Cut back to sound plaster","Brush out and prime the background","Fill deep areas in layers with backing plaster","Apply finish plaster and trowel it flat","Feather in the edges"],"Prepare, build up, finish."),
        T("Deep holes should be filled in one thick coat to save time.",false,"Thick coats slump and crack. Build up in layers."),
        TE("Mixing","Add plaster *to* clean water, not water to plaster, and mix to a smooth, lump-free paste. Dirty buckets make plaster set too fast.",null,"Mixing"),
        Q("How do you check a patch is flat with the wall?",["Run a straight edge across it","Look at it from the door","Feel it with your hand only","Paint it and see"],"A straight edge shows any high or low spots."),
        SC("A resident","Can you paint over that patch now?","What do you say?",[["It needs to dry first; I’ll explain when it can be painted","Wet plaster won’t take paint properly."],["Yes, straight away","The paint will fail."],["Never paint it","It can be painted once dry."]]),
        QF([["Add plaster to water",true],["Dirty buckets slow the set",false],["Feather the edges into the wall",true],["New plaster needs to dry before painting",true]])
      ]),
      lesson("pm-plas3","Unit challenge","Plastering repairs",[
        TROPHY(6),
        SP("Dev’s patch. Tap the mistake.",["Cut back to sound plaster","Primed the background","Filled a 40 mm hole in one coat","Checked it with a straight edge"],2,"Build deep holes up in layers."),
        Q("What does scrim tape do?",["Reinforces joints and cracks so they don’t crack through","Seals out water","Sticks tiles","Holds glass"],"It’s a reinforcing mesh."),
        T("You should leave the room as clean as you found it.",true,"Reinstate the area and remove your protection."),
        N(["Cut back","Prime the background","Apply backing plaster"],["Apply finish plaster and trowel it flat","Paint it","Sand it straight away"],"Finish coat goes on the backing."),
        Q("Who is responsible for checking your patch is up to standard before you leave?",["You are","The resident","The next trade","Nobody"],"Inspect your own work."),
        B("Build the plaster rule","Fill deep holes in layers",["one","coat"],"So it doesn’t slump or crack.")
      ],C)
    ]),
    unit("Painting and decorating","Painting and sealing",[
      lesson("pm-paint1","Preparation and defects","Why paint fails and how to prepare",[
        TE("Most paint faults start with preparation","Flaking, peeling, blistering and poor coverage usually come from *poor preparation* or *damp* in the surface.",null,"Preparation"),
        M("Match the defect to the likely cause",[["Flaking or peeling","Poor preparation or damp"],["Runs and sags","Too much paint applied"],["Blistering","Moisture or heat under the paint"],["Grinning (patchy)","Too few coats or poor coverage"]],"Know the cause, fix it properly."),
        O("Put preparing a wall in order",["Protect floors and fittings","Wash down any grease","Fill holes and cracks","Sand smooth and dust off","Spot prime the repairs"],"A clean, sound, smooth surface."),
        T("New plaster needs a thinned mist coat first.",true,"It’s very absorbent; the mist coat seals it."),
        Q("A ceiling has nicotine stains. What’s needed before emulsion?",["A stain-blocking primer","Nothing","More emulsion","Water"],"Stains bleed through ordinary emulsion."),
        TE("COSHH and paints","Read the label and the safety data sheet. Use *ventilation*, wear gloves, and store paints and solvents *sealed*, in a cool place away from heat and children."),
        QF([["Most paint failures come from poor preparation",true],["Runs come from too much paint",true],["Store solvents near a heater",false],["Read the safety data sheet",true]])
      ]),
      lesson("pm-paint2","Painting and sealing","Cutting in, rolling and running a bead",[
        TE("Cutting in and rolling","*Cut in* with a brush at edges and corners, then *roll* the main area in sections, keeping a *wet edge* so it doesn’t show lines.",null,"Brush and roller"),
        G("Keep a [wet] edge when rolling so you don’t get [lines].",["dry","drips"],"Work into wet paint."),
        TE("Sealing with a gun","Rake out old sealant, clean and dry the joint, then run a *continuous bead* with the gun and tool it smooth. Silicone for wet areas; decorator’s caulk where it will be painted.",null,"Sealant"),
        J("Right sealant?",[["Silicone round a bath",true,"Flexible and waterproof."],["Decorator’s caulk round a shower tray",false,"Caulk isn’t made for wet areas."],["Caulk on a skirting gap before painting",true,"It can be painted."],["Silicone where you’ll paint over it",false,"Paint won’t stick to silicone."]],["Right","Wrong"]),
        TE("Waste","Never pour paint or white spirit down a drain. Let small amounts dry out, and dispose of solvents and tins as the waste rules say. Reuse and recycle where you can.",null,"Waste"),
        SC("A resident","Can I have some of the leftover paint for touch-ups?","What do you do?",[["Check with your supervisor and follow company policy","Some organisations leave matching paint; it’s their decision."],["Pour it down their sink","Never."],["Throw it in their bin","It needs proper disposal."]]),
        QF([["Cut in before rolling",true],["Silicone can be painted over",false],["Rake out old sealant before resealing",true],["White spirit can go down a drain",false]])
      ]),
      lesson("pm-paint3","Unit challenge","Painting and decorating",[
        TROPHY(6),
        SP("Ella’s decorating. Tap the mistake.",["Protected the floor","Filled and sanded the holes","Rolled over wet filler without priming","Cut in the edges"],2,"Let fillers dry and spot prime them."),
        Q("Why give the resident clear feedback at the end of a job?",["So they know what was done and how to look after it","It wastes time","Only if they complain","It isn’t your job"],"Informed residents are happier and report problems early."),
        T("Everyone should be treated with respect, whatever their background.",true,"That’s part of an inclusive workplace and good service."),
        N(["Rake out the old sealant","Clean and dry the joint"],["Run a continuous bead and tool it smooth","Paint over it","Leave it to dry for a week first"],"A clean, dry joint takes a good bead."),
        Q("A tin of solvent-based paint is left over. Where does it go?",["Through the right waste route for hazardous waste","Down the drain","In the general bin","Left at the property"],"Your duty of care covers waste."),
        B("Build the decorating rule","Preparation is most of the job",["paint","quick"],"Good prep, good finish.")
      ],C)
    ]),
    unit("Tiling and flooring","Tiling and flooring",[
      lesson("pm-tile1","Tiling repairs","Defects, materials and replacing a tile",[
        TE("Tiling defects","Common faults: *cracked* tiles, *hollow* or loose tiles (poor adhesive coverage), *failed grout*, and *mould* in grout lines.",null,"Tile faults"),
        CD("Tiling kit",[["Tile adhesive","Tile adhesive","Fixes the tile. Full coverage stops hollow spots."],["Grout","Grout","Fills the joints between tiles."],["Spacers","Spacers","Keep even joints."],["Grout rake","Grout rake","Removes old grout to free a tile."]]),
        O("Put replacing a cracked tile in order",["Put on eye protection","Rake out the grout round the tile","Break the tile out from the middle","Clean back the old adhesive","Fix the new tile flush with the others","Grout and clean off"],"Protect the tiles round it."),
        T("Start breaking out a cracked tile at its edges.",false,"Start in the middle so you don’t chip the tiles next to it."),
        Q("A new tile sits proud of the others. What’s wrong?",["Too much adhesive or old adhesive not cleaned back","The grout is wrong","The tile is too thin","Nothing"],"It should be flush."),
        TE("Cutting round obstacles","Measure the position of a pipe from two edges, mark it on the tile, and cut with a tile drill or nippers. Measure twice, cut once."),
        QF([["Hollow tiles come from poor adhesive coverage",true],["Wear eye protection when breaking out tiles",true],["Spacers keep joints even",true],["Grout goes on before the adhesive sets",false]])
      ]),
      lesson("pm-tile2","Flooring repairs","Defects, setting out and cutting round obstacles",[
        TE("Flooring defects","Common faults: *lifting* or bubbling vinyl, *gaps* or peaking in laminate, *squeaky* boards and *damp* coming up from a concrete floor.",null,"Floor faults"),
        T("Laminate needs an expansion gap round the edge of the room.",true,"So it can expand without lifting."),
        Q("Before fitting a new floor covering on concrete, what must you check?",["That it’s dry, level and clean","Only the colour","Nothing","That the heating is on"],"Damp or uneven floors make coverings fail."),
        O("Put patching damaged vinyl in order",["Lay a matching piece over the damage, pattern lined up","Cut through both layers together","Remove the damaged piece","Clean the subfloor","Fix the new patch down"],"Cutting both layers together gives a perfect fit."),
        TE("Technical information","Check the *manufacturer’s instructions* for adhesives, gaps and drying times, and record what you used and where, so the next repair matches.",null,"Instructions and records"),
        M("Match the fault to the fix",[["Squeaky floorboard","Screw it down to the joist"],["Laminate peaking","Check and restore the expansion gap"],["Bubbling vinyl","Check for damp and refix"],["Cracked wall tile","Rake out, replace and regrout"]],"Find the cause, then fix it."),
        QF([["Check concrete floors for damp",true],["Squeaky boards can be screwed down",true],["Laminate should be tight to the walls",false],["Record the products you used",true]])
      ]),
      lesson("pm-tile3","Unit challenge","Tiling and flooring",[
        TROPHY(6),
        SP("Sam’s tile repair. Tap the mistake.",["Wore eye protection","Raked out the grout","Started breaking the tile at its corner","Fixed the new tile flush"],2,"Start in the middle."),
        Q("Why must residents’ details on your job app be kept secure?",["Data protection law (UK GDPR) requires it","To save battery","It only matters for bank details","So other trades can see them"],"Personal data must be protected."),
        T("Asking for training on something new is a good way to develop.",true,"Seeking learning is a behaviour assessors look for."),
        N(["Measure the pipe’s position from two edges","Mark it on the tile"],["Cut it with a tile drill or nippers","Fix the tile and hope","Smash a hole with a hammer"],"Measure, mark, cut."),
        Q("Laminate has lifted in the middle of a room. What’s the likely cause?",["The expansion gap round the edge has been closed up","Too much underlay","It’s too cold","The colour"],"It has nowhere to expand."),
        B("Build the cutting rule","Measure twice cut once",["guess","never"],"Accuracy saves tiles and time.")
      ],C)
    ]),
    unit("External repairs","External repairs",[
      lesson("pm-ext1","Masonry, damp and roofs","Pointing, damp proofing and slipped slates",[
        TE("Masonry defects","Watch for *failed pointing*, *cracked* or *spalling* bricks, *loose copings* and *damp*. Damp often comes from a *bridged damp proof course* (DPC) or leaking gutters.","dpc150","Masonry faults"),
        G("A damp proof course should be at least [150] mm above the ground.",["50","25"],"So rain splashing up can’t bridge it."),
        TE("Repointing","Rake out to about 15 mm, brush out and dampen, then point with mortar *no stronger than the bricks*, matching the colour and joint finish.","repoint","Repointing"),
        T("Strong cement mortar is best for repointing old soft bricks.",false,"It traps moisture and makes the bricks spall. Match the original, weaker mix."),
        TE("Roofs","Pitched roofs are covered in slates or tiles on battens; flat roofs have a membrane. A *slipped slate* can be refixed with a metal strip called a *tingle*. Any roof work needs safe access and fall protection.","cutroof","Roofs"),
        Q("What’s a tingle used for?",["Refixing a slipped slate","Clearing a drain","Hanging a door","Mixing mortar"],"A strip of lead, copper or stainless steel."),
        QF([["Bridged DPCs can cause damp",true],["Repoint with mortar weaker than the bricks",true],["Roof work needs no planning",false],["Leaking gutters can cause damp",true]])
      ]),
      lesson("pm-ext2","Fences, ground and knowing your limits","Fencing, paving and other trades",[
        TE("Fencing and railings","Panels sit between posts with a *gravel board* at the bottom to keep them off the ground. Rot usually starts at ground level. Railings rust where the paint has failed.","posts","Fences"),
        Q("A fence post has rotted at ground level. What’s the repair?",["Replace the post or fit a concrete repair spur","Paint over the rot","Nail a batten on","Leave it"],"The post holds the fence up."),
        TE("Groundwork and landscaping","Paving sinks or rocks when its base is poorly compacted or washed out. Paths and patios should *fall away* from buildings so water drains away.",null,"Paving"),
        T("A patio that slopes towards the house can cause damp.",true,"Water runs to the wall."),
        TE("Other trades and your limits","You work alongside electricians, plumbers, gas engineers, roofers and more. Know what’s *yours* to do, and *escalate* anything beyond your competence or authority to your supervisor.",null,"Know your limits"),
        SC("Your supervisor","While repointing you notice a big crack running through the wall.","What do you do?",[["Stop and report it so it can be assessed","It could be structural."],["Point over it","That hides a possible problem."],["Ignore it","It may get worse."]]),
        TE("Rights, respect and safeguarding","The *Equality Act 2010* protects people from discrimination. If you see signs that a resident may be at risk of harm, *report it* to your safeguarding lead. *Prevent* is about protecting people from being drawn into extremism."),
        QF([["Gravel boards keep fence panels off the ground",true],["Report safeguarding concerns to the safeguarding lead",true],["Paths should fall towards buildings",false],["Escalate work beyond your competence",true]])
      ]),
      lesson("pm-ext3","Unit challenge","External repairs",[
        TROPHY(6),
        SP("Ben’s repointing. Tap the mistake.",["Raked out to about 15 mm","Dampened the joints","Used a very strong cement mix on soft old bricks","Matched the joint finish"],2,"Strong mortar damages soft bricks."),
        Q("Which law protects people from discrimination?",["The Equality Act 2010","COSHH","The Environmental Protection Act","The Work at Height Regulations"],"Nine protected characteristics."),
        T("CPD helps you understand what you’re competent to do and where to get help.",true,"Keep learning and know your limits."),
        Q("A slate has slipped on a two-storey roof. What must come first?",["Plan safe access and fall protection","Climb up quickly","Use a step ladder","Ask the resident to hold the ladder"],"Work at height must be planned."),
        N(["Spot that the paving has sunk","Lift the slabs"],["Re-compact and re-lay the base","Lay the slabs back on the soft base","Fill under with sand only"],"Fix the base, then the slabs."),
        B("Build the pointing rule","Mortar no stronger than the bricks",["stronger","cement"],"Let the joint be the weak point.")
      ],C)
    ])
  ]);
})();
