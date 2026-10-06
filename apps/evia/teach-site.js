/* Teach me: Site Carpenter. Each unit has two short lessons (Evia teaches a little, you try it, then something
   new) and a unit challenge with new questions from new angles. */
(function(){
  const {TE,EX,W,CD,Q,T,M,O,G,B,TAP,S,J,SP,N,SC,HOT,LB,QF,TROPHY,lesson,unit,add}=window.EVIA_TEACH;
  const C={challenge:true};
  add("site",[
    unit("Structural carcassing","Structural carcassing",[
      lesson("sc-carc1","Load-bearing studwork","Plates, studs, noggins and openings",[
        EX("A load-bearing stud wall","Tap each part.","studwall",[[60,116,"Sole plate","The bottom timber, fixed to the floor."],[200,10,"Head plate","The top timber tying the studs together."],[24,40,"Stud","Uprights, usually at 400 or 600 mm centres."],[54,61,"Noggin","Short pieces between studs for bracing and board fixings."],[143,25,"Lintel","Carries the load over the opening."],[110,74,"Cripple stud","A short stud that holds up the lintel."]]),
        TE("Why 600 mm?","Plasterboard sheets are 1,200 mm wide, so studs at 400 or 600 mm centres put every board edge on a stud."),
        Q("Boards are 1,200 mm wide. Which stud centres let every edge land on a stud?",["600 mm","500 mm","700 mm","450 mm"],"1,200 ÷ 600 = 2, so the edges always meet a stud."),
        O("Put building a stud wall in order",["Set out and fix the sole plate","Mark the stud positions on both plates together","Fix the head plate","Fit the studs plumb","Fit noggins and trim openings"],"Marking both plates together keeps studs plumb."),
        TE("Strength class","Carcassing timber is graded, like *C16* or *C24*. C24 is stronger. Use the grade and size on the drawing: never swap for something smaller.",null,"Strength class"),
        T("You can swap load-bearing timber for a smaller size if that’s all there is.",false,"Structural sizes come from the engineer. Never undersize.")
      ]),
      lesson("sc-carc2","Power tools and timber","Using tools well and storing timber",[
        M("Match the power tool to a safety point",[["Circular saw","Guard working, work supported"],["Nail gun","Sequential trigger; never point it at anyone"],["Drill","Right bit and a firm grip"],["Mitre saw","Let the blade stop before lifting"]],"Every tool has its rules."),
        SC("Changing a blade","You need to change the circular saw blade.","First you…",[["Unplug it or take out the battery","Isolating stops it starting unexpectedly."],["Switch off at the trigger","A knock can switch it on."],["Hold the blade still","It could still start."]]),
        TE("Timber on site","Softwoods (spruce, pine, Douglas fir) are used for carcassing. Treated timber resists rot. Engineered timber, like I-joists and glulam, is strong and stable. Store it flat, off the ground on bearers, and covered."),
        J("Good timber storage?",[["Flat on bearers, off the ground",true,"It stays straight and dry."],["Standing on end against a wall",false,"It bends and bows."],["Covered but with air round it",true,"Dry, without sweating."],["On wet mud, uncovered",false,"It gets wet and stained."]]),
        QF([["C24 is stronger than C16",true],["Studs at 600 mm suit 1,200 mm boards",true],["Remove the saw guard for a quick cut",false],["Store timber on end",false]])
      ]),
      lesson("sc-carc3","Unit challenge","Carcassing",[
        TROPHY(6),
        HOT("Tap the part that holds up the lintel","studwall",[[110,74,10,"Short stud"],[143,25,16,"Beam over the opening"],[54,61,12,"Short brace"],[200,10,16,"Top timber"]],0,"The cripple stud."),
        Q("A wall is 3.6 m long with studs at 600 mm centres. How many studs, counting both ends?",["7","6","8","12"],"3,600 ÷ 600 = 6 spaces, so 7 studs."),
        T("Noggins give fixings for board edges and brace the studs.",true,"Two jobs in one."),
        SP("Jay’s stud wall. Tap the mistake.",["Marked both plates together","Used C24 as drawn","Swapped the lintel for a smaller size","Fitted the studs plumb"],2,"Never undersize structural timber."),
        B("Build the rule","Never undersize structural timber",["always","bigger"],"Use what the engineer specifies.")
      ],C)
    ]),
    unit("Timber/metal partition walls","Partition walls",[
      lesson("sc-part1","Timber and metal partitions","Studs, tracks and lasers",[
        TE("Metal partitions","Metal partitions use *U-tracks* at the top and bottom with *C-studs* clipped between, then boards screwed on. Set out the line, fix the tracks, then the studs.","metalstud"),
        S("Timber or metal system?",["Timber","Metal"],[["Track",1,"The metal channel top and bottom."],["C-stud",1,"The metal upright."],["Sole plate",0,"Timber at the bottom."],["Noggin",0,"A timber brace."]]),
        TE("Laser levels","A cross-line laser projects level and plumb lines. Check it often, store it in its case, and never look into the beam."),
        SC("Setting out","You’re not sure the laser is still accurate.","How do you check it?",[["Mark a line, turn it 180° and check it matches","If they don’t match, it needs recalibrating."],["Look into the beam","Never look into a laser."],["Shake it","That could knock it further out."]]),
        TE("Span tables","A span table gives the timber size for a span, spacing and strength class. Pick the size that suits all three."),
        T("It’s safe to glance into a laser beam.",false,"Even low-power lasers can damage eyes.")
      ]),
      lesson("sc-part2","Modern methods","How buildings go together now",[
        TE("Modern methods","Timber frame panels, SIPs, metal framing and factory-built modules are quicker to put up, but they need accurate site work: there’s little room to adjust."),
        M("Match the method",[["Timber frame panels","Wall panels made in a factory"],["SIPs","Insulated panels, strong and quick"],["Metal stud systems","Light, straight framing for partitions"],["Volumetric modules","Whole rooms built off site"]],"Different ways to build faster."),
        Q("Why do factory-made components need accurate site work?",["There’s little room to adjust them","They’re heavier","They’re cheaper","They don’t"],"Setting out must be spot on."),
        T("Asking to learn a new system, like metal studs, helps you develop.",true,"Seek out learning.")
      ]),
      lesson("sc-part3","Unit challenge","Partitions",[
        TROPHY(5),
        Q("What goes at the top and bottom of a metal partition?",["U-tracks","C-studs","Noggins","Sole plates"],"Tracks, with C-studs between."),
        T("Turning a laser 180° and checking the lines match tests its accuracy.",true,"If not, recalibrate."),
        SP("Kai’s partition. Tap the mistake.",["Set out the line with a laser","Fixed the tracks first","Looked down the beam to line it up","Screwed the boards to the studs"],2,"Never look into the beam."),
        Q("What does a span table tell you?",["The timber size for a span, spacing and grade","The price","The screw size","The moisture"],"Size from span, spacing and strength."),
        B("Build the rule","Never look into a laser",["always","briefly"],"It can damage your eyes.")
      ],C)
    ]),
    unit("Floor joists (and coverings)","Floor joists",[
      lesson("sc-floor1","Joists and strutting","Sizing, strutting, notches and holes",[
        TE("Joists","Joist sizes come from span tables. Joists sit in hangers or on bearers, level and at the right centres. *Strutting* stops them twisting: one row for spans of 2.5 to 4.5 m, two rows over 4.5 m.",null,"Strutting"),
        Q("A joist spans 3.6 m. How many rows of strutting?",["One, at mid-span","None","Two","Three"],"2.5 to 4.5 m needs one row.",{again:G("A 5 m span needs [two] rows of strutting.",["one","no"],"Over 4.5 m: two rows.")}),
        TE("Notches and holes","Notch only the *top edge*, up to 0.125 × the depth, between 0.07 and 0.25 of the span from a support. Drill holes on the *centre line*, up to 0.25 × the depth, between 0.25 and 0.4 of the span.","joist"),
        HOT("Tap where you may drill a hole for a cable","joist",[[111,58,16,"Centre, a quarter in"],[64,42,16,"Top edge near the end"],[160,72,16,"Bottom, mid-span"],[26,58,10,"Right by the support"]],0,"On the centre line, 0.25 to 0.4 of the span from the support."),
        TE("Floor coverings","Moisture-resistant tongue-and-groove chipboard is glued and fixed to every joist, joints staggered, with an expansion gap round the edge."),
        T("Floor boards should be laid tight against the walls.",false,"Leave an expansion gap so they don’t buckle.")
      ]),
      lesson("sc-floor2","Fixings, decay and the environment","Structural fixings, rot and resources",[
        TE("Joist hangers","A joist hanger carries a joist end on a wall or beam. It only works if it’s fixed with the right nails in *every* hole.","hanger"),
        M("Match the fixing",[["Joist hanger","Carries a joist end"],["Restraint strap","Ties floors or roofs to the walls"],["Coach screw","Heavy-duty timber fixing"],["Truss clip","Fixes trusses to the wall plate"]],"Structural fixings follow the maker’s instructions."),
        S("What’s the problem?",["Wet rot","Dry rot","Woodworm"],[["Soft, dark timber where it stays damp",0,"Wet rot."],["White strands and a mushroom-like growth",1,"Dry rot."],["Small round exit holes",2,"Woodworm."]]),
        T("Using offcuts for noggins and strutting reduces waste.",true,"Good planning uses materials efficiently.")
      ]),
      lesson("sc-floor3","Unit challenge","Floor joists",[
        TROPHY(6),
        Q("An electrician wants to notch the bottom edge of a joist mid-span. What do you say?",["No: notches are only allowed in the top edge near the supports","Yes, it’s fine","Only if it’s small","Only with glue"],"The bottom mid-span is under most stress."),
        Q("A 200 mm deep joist. What’s the deepest notch allowed?",["25 mm","50 mm","100 mm","10 mm"],"0.125 × 200 = 25 mm."),
        SP("Sam’s floor. Tap the mistake.",["Strutting at mid-span on a 4 m span","Hanger nailed in every hole","Boards tight to the walls","Joints in the boards staggered"],2,"Leave an expansion gap."),
        T("Two rows of strutting are needed for spans over 4.5 m.",true,"One row from 2.5 to 4.5 m."),
        HOT("Tap where a notch is allowed","joist",[[64,42,14,"Top edge near a support"],[160,58,16,"Centre, mid-span"],[160,74,14,"Bottom, mid-span"],[240,74,14,"Bottom near a support"]],0,"The top edge, 0.07 to 0.25 of the span from a support."),
        B("Build the hanger rule","Right nails in every hole",["some","screws"],"Or it can’t carry the load.")
      ],C)
    ]),
    unit("Straight flights of stairs","Stairs",[
      lesson("sc-stair1","Fitting a straight flight","Fixing, levels and the rules",[
        EX("The parts","Tap each part.","stair",[[152,56,"String","The side board that carries the steps."],[141,38,"Tread","What you step on."],[86,95,"Riser","The upright between treads."],[82,74,"Nosing","The front edge of each tread."]]),
        O("Put fitting a flight in order",["Check the opening and total rise","Offer up the flight and check it’s level","Fix the top to the trimmer","Fix the wall string","Fit newels and protect the treads"],"Check before you fix."),
        TE("The rules","For private stairs: rise up to 220 mm, going at least 220 mm, pitch up to 42°, and at least 2 m headroom."),
        G("The maximum rise on a private stair is [220] mm.",["250","180"],"And the going at least 220 mm."),
        T("Treads should be protected while other trades are working.",true,"Covers stop damage and slips.")
      ]),
      lesson("sc-stair2","Drawings and staying safe","Information and awareness",[
        TE("Revisions","Drawings get updated. Always check you’re working from the latest revision before you set out or fix."),
        SC("Your supervisor","The stair drawing on the wall is revision B; the office has revision C.","What do you do?",[["Get revision C before fitting anything","An older version may have different sizes."],["Use B: it’s close enough","Close enough can mean refitting."],["Guess which is right","Always check."]]),
        J("Safe on a stair fit?",[["Covering the open stairwell",true,"No one falls through."],["Working next to an unguarded opening",false,"Stop and report it."],["Clearing offcuts as you go",true,"Fewer trips."],["Trailing leads up the flight",false,"A trip on a stair is serious."]],["Safe","Not safe"]),
        T("Putting safety first means stopping if a stairwell isn’t protected.",true,"Report it.")
      ]),
      lesson("sc-stair3","Unit challenge","Stairs",[
        TROPHY(5),
        Q("Total rise 2,640 mm with 12 risers. Each rise is…",["220 mm, right at the limit","200 mm","240 mm, too steep","264 mm"],"2,640 ÷ 12 = 220 mm."),
        HOT("Tap the riser","stair",[[86,95,9,"Upright between steps"],[141,38,11,"Top of a step"],[152,56,14,"Side board"],[82,74,9,"Front edge"]],0,"The upright between treads."),
        T("Headroom over a private stair must be at least 2 m.",true,"Measured from the pitch line."),
        SP("Kai’s stair fit. Tap the mistake.",["Checked the total rise","Fixed the top to the trimmer","Worked from last month’s drawing","Protected the treads"],2,"Check the latest revision."),
        B("Build the rule","Check the latest drawing first",["old","later"],"Revisions change sizes.")
      ],C)
    ]),
    unit("Service encasement","Service encasement",[
      lesson("sc-serv1","Boxing in services","Frames, access and fire",[
        TE("Boxing in","Frame round pipes with battens, then board it in. Leave *access panels* at valves, meters and joints. Don’t fix through pipes or cables, and allow for pipes expanding.","boxing"),
        O("Put boxing in a pipe in order",["Find the services and check for hidden pipes and cables","Fix the battens to form the frame","Cut and fit the boards","Fit an access panel at the valve","Fill and finish ready for decoration"],"Access panels mean nothing has to be ripped out later."),
        SC("Before you fix","You’re about to screw a batten to the wall next to the boiler pipes.","What do you use first?",[["A cable and pipe detector","Check before you drill or fix."],["A spirit level","That won’t find hidden services."],["A tape measure","Measuring won’t show what’s inside."]]),
        T("Fire-rated boxing must be built exactly as specified.",true,"Gaps or the wrong board let fire spread.")
      ]),
      lesson("sc-serv2","Tools, fire and people","Hand tools, extinguishers, wellbeing and inclusion",[
        M("Match the hand tool",[["Tenon saw","Accurate small cuts"],["Block plane","Trimming end grain and edges"],["Sliding bevel","Copying angles"],["Spirit level","Checking level and plumb"]],"The right tool for each job."),
        HOT("Tap the extinguisher for burning petrol","extinguishers",[[40,62,28,"Red"],[120,62,28,"Cream"],[200,62,28,"Black"],[280,62,28,"Blue"]],1,"Foam, with the cream band."),
        SC("On site","A workmate says they’ve been struggling with stress.","Where can they get support?",[["Their employer, a mental health first aider or the Construction Industry Helpline","Help is there: use it."],["Nowhere on site","There’s more support than people think."],["Social media","That isn’t proper support."]]),
        J("Inclusive, or not?",[["Making sure everyone can use the welfare cabins",true,"Everyone can take part."],["Nicknames about someone’s background",false,"Not acceptable."],["Leaving people out of briefings",false,"Everyone needs the information."],["Checking a new starter understood the briefing",true,"Inclusion in practice."]],["Inclusive","Not inclusive"])
      ]),
      lesson("sc-serv3","Unit challenge","Service encasement",[
        TROPHY(5),
        HOT("Tap what the plumber will thank you for","boxing",[[75,63,26,"Panel"],[75,20,14,"Top of the box"],[200,30,20,"Wall"],[75,110,14,"Bottom of the box"]],0,"The access panel at the valve."),
        T("You can nail through a pipe as long as it’s copper.",false,"Never fix through pipes or cables."),
        Q("Which extinguisher suits an electrical fire?",["CO2","Water","Foam","None"],"CO2, the black band."),
        SP("Sam’s boxing. Tap the mistake.",["Used a detector first","Framed with battens","Boarded over the valve with no access","Used fire-rated board as specified"],2,"Valves need an access panel."),
        B("Build the rule","Leave access to every valve",["hide","no"],"Services need maintaining.")
      ],C)
    ]),
    unit("Cladding","Cladding",[
      lesson("sc-clad1","Fitting timber cladding","Battens, gaps, fixings and profiles",[
        EX("Cladding in section","Tap each layer.","cladding",[[120,45,"Breathable membrane","Keeps rain off the wall but lets vapour out."],[127,28,"Batten","Holds the boards off the wall. Battens run up and down so air can rise between them."],[142,72,"Cladding boards","Feather-edge boards, thin edge up, each overlapping the one below so rain runs off."],[127,94,"Ventilated gap","Air flows up behind the boards so they dry out."]]),
        Q("Why leave a ventilated gap behind cladding?",["So moisture dries out and the timber doesn’t rot","To save boards","For cables","It isn’t needed"],"Airflow keeps the back dry."),
        M("Match the profile",[["Shiplap","Rebated boards that overlap neatly"],["Feather-edge","Tapered boards that overlap"],["Board-on-board","Vertical boards with gaps covered by others"],["Tongue and groove","Boards that lock edge to edge"]],"Profiles look and shed water differently."),
        TE("Fixings","Use stainless steel fixings with cedar and oak: their tannins react with plain steel and stain black. Leave movement gaps and fit insect mesh at the vents."),
        T("Cladding boards should be fixed tight with no movement gaps.",false,"Timber moves with moisture.")
      ]),
      lesson("sc-clad2","Safe systems and asbestos","Planning safe work",[
        M("Match the document",[["Risk assessment","Finds hazards and controls"],["Method statement","Safe step-by-step method"],["Toolbox talk","Short safety briefing"],["Induction","Site rules when you start"]],"Read them first."),
        SC("Stripping old soffits","The old boards could contain asbestos.","What do you do?",[["Stop, leave them and tell your supervisor","Only licensed contractors deal with it."],["Snap them off quickly","That releases fibres."],["Cut them smaller","Cutting makes dust."]]),
        J("Safe cladding at height?",[["Scaffold with guard rails and clear platforms",true,"Collective protection first."],["Offcuts left on the lift",false,"They can fall or trip someone."],["Area below barriered off",true,"Nothing falls on anyone."],["Carrying long boards up a ladder alone",false,"Plan the lift and get help."]],["Safe","Not safe"]),
        T("Planning lifts of long boards helps avoid back strain.",true,"Wellbeing includes physical health.")
      ]),
      lesson("sc-clad3","Unit challenge","Cladding",[
        TROPHY(5),
        Q("Black streaks have appeared round the nails in new cedar cladding. What happened?",["Plain steel nails reacted with the tannins","It rained","The boards are too dry","Bad paint"],"Use stainless steel fixings."),
        HOT("Tap the ventilated gap","cladding",[[127,94,7,"Gap behind the boards"],[92,61,22,"Wall"],[142,72,6,"Boards"],[120,45,5,"Membrane"]],0,"The gap behind the boards, between the battens."),
        T("Feather-edge boards are tapered and overlap.",true,"Thick edge over thin."),
        SP("Jay’s cladding. Tap the mistake.",["Fitted the membrane","Used battens for a gap","Fixed the boards tight together","Used stainless nails"],2,"Leave movement gaps."),
        B("Build the rule","Leave a gap for air behind",["no","front"],"So the boards dry out.")
      ],C)
    ]),
    unit("Wall and floor units","Units and fitments",[
      lesson("sc-units1","Fitting units","Datums, level and worktops",[
        TE("Start from a datum","Find the *high point* of the floor and set a level datum line. You can pack units up to the line, but you can’t cut the floor down.",null,"Datum"),
        O("Put fitting a run of units in order",["Check the floor and set a level datum","Fit the base units level to the datum","Fix the wall units securely","Fit and joint the worktop","Fit doors and adjust them"],"A good datum lines everything up."),
        Q("Why start from the high point of the floor?",["So every unit can be packed up to the same level","It’s easiest","To save legs","It doesn’t matter"],"You can pack up, not cut down."),
        TE("Jigs","A worktop jig guides the router for accurate joints. A handmade jig for drilling handle holes puts every handle in the same place."),
        T("Wall units can be fixed with any screws into plasterboard.",false,"Use proper fixings into studs or suitable cavity fixings.")
      ]),
      lesson("sc-units2","Environment and teamwork","Waste and working together",[
        S("Where does it go?",["Recycle or reuse","Hazardous"],[["Packaging cardboard",0,"Flatten and recycle."],["Clean timber offcuts",0,"Reuse or recycle."],["Empty sealant tubes",1,"Dispose of as marked."],["Worktop offcuts",0,"Small shelves, or recycle."]]),
        M("Match the teamwork habit",[["Communicating","Telling the plumber when units are fitted"],["Reliability","Finishing when you said"],["Respect","Leaving the kitchen clean for the next trade"],["Helping","Carrying a worktop together"]],"Kitchens need everyone in the right order."),
        T("FSC or PEFC timber comes from well-managed forests.",true,"Choose it where you can.")
      ]),
      lesson("sc-units3","Unit challenge","Units and fitments",[
        TROPHY(5),
        Q("The floor falls 15 mm across a kitchen. Where do you set the datum from?",["The highest point of the floor","The lowest point","The middle","The door"],"Pack everything up to it."),
        N(["Set a level datum","Fit the base units"],["Fix the wall units","Fit the doors first","Tile the walls"],"Then the worktop, then doors."),
        SP("Kai’s kitchen. Tap the mistake.",["Set the datum from the high point","Used a jig for the worktop joints","Hung the wall units on plasterboard screws","Adjusted the doors last"],2,"Heavy units need proper fixings."),
        T("A jig makes repeat holes identical.",true,"Every handle in the same place."),
        B("Build the rule","Start from the high point",["low","middle"],"Pack up, never cut down.")
      ],C)
    ]),
    unit("Handrails and spindles","Handrails and spindles",[
      lesson("sc-hand1","Fitting handrails and spindles","Heights, gaps and fixing",[
        EX("A balustrade","Tap each part.","balustrade",[[38,70,"Newel post","Fixed solid and plumb: the handrail relies on it."],[150,18,"Handrail","About 900 mm above the pitch line on a house stair."],[128,64,"Spindle","Cut to the stair pitch so it sits tight."],[73,64,"The 100 mm rule","No gap can let a 100 mm sphere through."]]),
        Q("What’s the largest gap allowed between spindles on a house stair?",["Less than 100 mm","150 mm","120 mm","200 mm"],"So a child can’t get through."),
        TE("Copying the pitch","Set a *sliding bevel* to the stair pitch and mark every spindle end with it, so they all sit tight on the string or baserail.",null,"Sliding bevel"),
        M("Match the tool",[["Sliding bevel","Copying the pitch angle"],["Tenon saw","Cutting spindles cleanly"],["Spirit level","Checking newels are plumb"],["Chisel","Trimming housings"]],"The right tool for each job."),
        T("A loose newel makes the whole balustrade unsafe.",true,"Fix newels solidly.")
      ]),
      lesson("sc-hand2","Signs, words and learning","Safety signs and clear communication",[
        CD("Safety signs",[[{pic:"sign-hat"},"Blue circle: must do","Here, wear a hard hat."],[{pic:"sign-nophone"},"Red ring: must not","Here, no mobile phones."],[{pic:"sign-electric"},"Yellow triangle: warning","Here, danger: electricity."],[{pic:"sign-eyewash"},"Green square: safe condition","Here, an eyewash station."]]),
        M("Match the trade word",[["Pitch line","Line joining the nosings"],["Newel","Main post of a balustrade"],["Baluster","Another name for a spindle"],["Going","Depth of a step"]],"Trade words keep things clear."),
        Q("Which is the clearest message to your supervisor?",["The top newel is 5 mm out of plumb; shall I reset it before fitting the rail?","Something’s wrong","It’s a bit off","Not sure"],"Say what, where, and what you suggest."),
        T("Asking an experienced carpenter to watch you fit spindles helps you learn.",true,"Feedback helps you improve.")
      ]),
      lesson("sc-hand3","Unit challenge","Handrails and spindles",[
        TROPHY(5),
        HOT("Tap the part everything relies on","balustrade",[[38,70,12,"End post"],[128,64,8,"Upright"],[200,95,12,"Bottom rail"],[73,64,8,"Gap"]],0,"The newel post."),
        Q("A handrail is fixed 780 mm above the pitch line on a house stair. What do you say?",["It’s too low: it should be about 900 mm","It’s fine","It’s too high","It doesn’t matter"],"About 900 mm."),
        T("A baluster is the same as a spindle.",true,"Two names for the same thing."),
        SP("Jay’s balustrade. Tap the mistake.",["Newel fixed plumb","Spindle ends marked with a sliding bevel","Spindles 130 mm apart","Handrail at 900 mm"],2,"Gaps must be under 100 mm."),
        B("Build the rule","No gap bigger than 100 mm",["over","wide"],"To keep children safe.")
      ],C)
    ]),
    unit("Internal and external doors","Doors",[
      lesson("sc-door1","Hanging doors","Sizing, gaps and connections",[
        TE("Even gaps","Plane the door to fit with even gaps of about *2 to 3 mm* at the sides and top, and a floor gap to suit the covering. Take a little off at a time."),
        O("Put hanging a door in order",["Measure the opening and check it’s square","Trim the door with even gaps","Mark and cut in the hinges","Hang it and check the swing","Fit the lock and handles"],"Small amounts at a time."),
        TE("Hinges and handles","Top hinge about 150 mm from the top, bottom about 225 mm from the bottom, and the handle about 1,000 mm up. Heavy and fire doors often need a third hinge.","hinges"),
        M("Match the product",[["Mastic sealant","Sealing gaps round external frames"],["Preservative","Protecting timber from rot and insects"],["Wood filler","Filling holes before painting"],["Weather seal","Stopping draughts at external doors"]],"The right product for the job."),
        T("The door schedule tells you which way each door opens.",true,"Size, type, hand and fire rating.")
      ]),
      lesson("sc-door2","Sharp tools and safety","Maintaining hand tools",[
        TE("Sharpening","Grind at about *25°*, hone at about *30°*, flatten the back and remove the burr. A sharp tool needs less force, so it’s safer.","chisel"),
        O("Put sharpening a plane iron in order",["Flatten the back","Grind the bevel at about 25°","Hone at about 30°","Remove the burr","Refit and set the blade"],"Set it to take a fine shaving."),
        SC("Hanging an external door","It’s a heavy solid oak door.","How do you move it into place?",[["With a second person or a door lifter","Two-person lifts prevent injuries."],["Carry it alone, carefully","That risks your back."],["Drag it across the floor","That damages the door and floor."]]),
        T("Blunt chisels are more likely to slip.",true,"You push harder.")
      ]),
      lesson("sc-door3","Unit challenge","Doors",[
        TROPHY(5),
        Q("A door sticks at the top of the latch side. What’s the likely fix?",["Plane a little off that edge to even the gap","Add a third hinge","Oil the handle","Force it"],"Keep even 2 to 3 mm gaps."),
        HOT("Tap where the bottom hinge goes","hinges",[[110,114,12,"Bottom hinge"],[110,22,12,"Top hinge"],[180,80,12,"Handle"],[150,40,16,"Upper panel"]],0,"About 225 mm from the bottom."),
        SP("Sam’s door. Tap the mistake.",["Checked the door schedule","Planed small amounts at a time","Left a 10 mm gap at the top","Fitted a weather seal to the external door"],2,"About 2 to 3 mm."),
        T("Fire doors must follow their certification when fitting ironmongery.",true,"Any change must be approved."),
        B("Build the gap rule","About 2 to 3 mm all round",["10","none"],"Even gaps look right and stop sticking.")
      ],C)
    ]),
    unit("Skirting boards and architrave","Skirting and architrave",[
      lesson("sc-skirt1","Skirting and architrave","Mitres, scribes and splices",[
        TE("Corners","*Mitre* external corners at 45°. *Scribe* internal corners: cut one board’s profile to fit over the other, so the joint stays tight when the timber shrinks.","corners"),
        HOT("Tap the corner you’d scribe","corners",[[42,70,20,"Left corner"],[184,70,20,"Right corner"]],0,"The internal corner."),
        M("Match the joint",[["Mitre","External corners"],["Scribe","Internal corners"],["Splice (scarf)","Joining lengths on a long run"],["Margin","The even reveal between architrave and lining"]],"Each joint has its place."),
        TE("Architrave margin","Set architrave back from the lining edge by an even margin of about *5 mm*, and splice long runs with a 45° scarf so movement doesn’t show."),
        O("Put fitting a length of skirting in order",["Measure the wall","Cut one end to scribe or mitre","Mark and cut the other end","Dry-fit and adjust","Fix to the wall"],"Dry-fit before fixing.")
      ]),
      lesson("sc-skirt2","Dust and working for yourself","Controls, waste and employment",[
        M("Match the control",[["LEV","Extracts dust at the saw"],["RPE","Filters the air you breathe"],["Eye protection","Stops chips reaching your eyes"],["Hearing protection","Protects your ears from saw noise"]],"Protect yourself from every hazard."),
        TE("Tax and CIS","Employed: PAYE. Self-employed: Self Assessment. Under *CIS*, 20% is taken from a registered subcontractor’s pay, 30% if unregistered."),
        Q("Under CIS, what’s taken from an unregistered subcontractor?",["30%","20%","0%","50%"],"20% if registered."),
        T("Self-employed carpenters need records of what they earn and spend.",true,"For the tax return.")
      ]),
      lesson("sc-skirt3","Unit challenge","Skirting and architrave",[
        TROPHY(5),
        Q("An internal mitre has opened up after a month. What would have prevented it?",["Scribing the corner instead","More glue","A longer nail","Caulk"],"Scribes stay tight when timber shrinks."),
        T("Architrave is set back from the lining edge by an even margin.",true,"About 5 mm."),
        SP("Jay’s skirting. Tap the mistake.",["Mitred the external corners","Mitred the internal corners","Spliced the long run at 45°","Dry-fitted before fixing"],1,"Internal corners should be scribed."),
        Q("What angle is each cut in a square external mitre?",["45°","90°","30°","60°"],"Two 45° cuts make 90°."),
        B("Build the corner rule","Scribe inside and mitre outside",["outside","inside"],"Scribes stay tight.")
      ],C)
    ]),
    unit("Window boards","Window boards",[
      lesson("sc-wb1","Fitting window boards","Measuring, notching and shaping",[
        EX("A window board","Tap each part.","windowboard",[[78,74,"Horn","The part that runs past the reveal, notched round the plaster line."],[160,86,"Bullnose","The rounded front edge."],[50,35,"Reveal","The side of the opening the board is notched round."]]),
        O("Put fitting a window board in order",["Measure the reveal and overhang","Mark out the horns and notches","Cut and shape the board","Dry-fit and check it’s level","Fix and seal"],"Mark from the reveal, not just the tape."),
        Q("What angle for a mitred return on a square corner?",["45°","30°","90°","60°"],"Two 45° cuts make 90°."),
        T("A window board should be fixed level even if the sill isn’t.",true,"Pack it level.")
      ]),
      lesson("sc-wb2","Standards and inclusion","Rules and fairness at work",[
        M("Match the standard",[["British Standards","Agreed ways to make and fit things"],["Building Regulations","Legal requirements for buildings"],["Warranty standards","Quality rules for new homes"],["Specification","What this job must use"]],"Different rules, different jobs."),
        M("Match the word",[["Equity","Fair access and treatment"],["Diversity","Valuing differences"],["Inclusion","Everyone feels part of the team"],["Discrimination","Treating someone unfairly because of who they are"]],"Four ideas to know."),
        SC("A briefing","Some of the gang have English as a second language.","What helps?",[["Clear, simple briefings and checking everyone understood","Everyone needs the safety information."],["Only brief the regulars","That leaves people at risk."],["Talk faster","That makes it harder."]]),
        T("Challenging offensive comments helps an inclusive culture.",true,"Or report them if you can’t safely.")
      ]),
      lesson("sc-wb3","Unit challenge","Window boards",[
        TROPHY(4),
        HOT("Tap the horn","windowboard",[[78,74,12,"Left end"],[160,86,14,"Front edge"],[160,46,16,"Middle"],[50,35,16,"Wall"]],0,"The part running past the reveal."),
        SP("Kai’s window board. Tap the mistake.",["Measured the overhang","Notched the horns","Fixed it following the sloping sill","Sealed it"],2,"Pack it level."),
        T("Diversity means valuing people’s differences.",true,"Different backgrounds make stronger teams."),
        B("Build the rule","Pack it level then fix it",["slope","first"],"Level, even if the sill isn’t.")
      ],C)
    ]),
    unit("Roofs and loft hatch","Roofs",[
      lesson("sc-roof1","Pitched roofs","Trussed and cut roofs",[
        EX("A cut roof","Built on site. Tap each part.","cutroof",[[160,16,"Ridge","The board at the top where the rafters meet."],[120,40,"Rafter","Runs from the wall plate to the ridge."],[90,56,"Purlin","A beam supporting the rafters part way up."],[290,91,"Wall plate","The timber on the wall the rafters sit on, notched with a birdsmouth."],[200,97,"Ceiling joist","Ties the feet of the rafters together."]]),
        TE("Trussed rafters","Trusses are made in a factory, usually fitted at 600 mm centres and braced with diagonal and longitudinal bracing. *Never cut or alter a truss*: trim openings as the designer shows."),
        SC("Fitting a loft hatch","A truss is right where the hatch needs to go.","What do you do?",[["Trim the opening as the designer shows, without cutting the truss","Trusses are engineered as a whole."],["Cut the bottom chord and add a noggin","That weakens the whole truss."],["Move the truss","It’s part of the design."]]),
        TE("Rafter length","A rafter rising 3 m over a 4 m run is 5 m long before the overhang: it’s a 3-4-5 triangle.","square345"),
        Q("A rafter rises 1.5 m over a 2 m run. How long is it?",["2.5 m","3.5 m","3 m","2 m"],"Half of 3-4-5 is 1.5-2-2.5."),
        T("Roof bracing is optional if the trusses look straight.",false,"Bracing is essential.")
      ]),
      lesson("sc-roof2","Flat roofs and height","Warm and cold roofs, lists and safety",[
        TE("Warm or cold?","A *warm roof* has insulation above the deck, over a vapour control layer. A *cold roof* has insulation between the joists and a ventilated gap above. Firrings give the fall.","flatroofs"),
        HOT("Tap the cold roof","flatroofs",[[81,50,40,"Left roof"],[239,50,40,"Right roof"]],1,"Insulation between the joists, with a ventilated gap."),
        Q("Roof joists at 400 mm centres over 4.8 m. How many joists?",["13","12","11","16"],"4,800 ÷ 400 = 12 spaces, so 13 joists."),
        J("Safe roof work?",[["Scaffold with edge protection",true,"Collective protection first."],["A ladder for a whole day’s roofing",false,"Ladders are for short, simple tasks."],["Calling out before passing materials up",true,"Everyone knows what’s coming."],["Going into the loft without telling anyone",false,"Roof voids can be confined spaces."]],["Safe","Not safe"])
      ]),
      lesson("sc-roof3","Unit challenge","Roofs",[
        TROPHY(6),
        HOT("Tap the purlin","cutroof",[[90,56,8,"Block under the rafter"],[160,16,10,"Top"],[120,40,10,"Sloping timber"],[200,97,14,"Bottom tie"]],0,"The purlin supports the rafters part way up."),
        Q("What does a birdsmouth do?",["Lets the rafter sit on the wall plate","Joins rafters at the ridge","Holds a purlin","Vents the roof"],"A notch that seats the rafter."),
        T("In a warm roof the insulation is above the deck.",true,"Over a vapour control layer."),
        SP("Sam’s roof. Tap the mistake.",["Trusses at 600 mm centres","Fitted the bracing","Cut a truss chord for the hatch","Fixed trusses with truss clips"],2,"Never cut a truss."),
        Q("A rafter rises 3 m over 4 m. How long, before the overhang?",["5 m","7 m","3.5 m","12 m"],"3-4-5."),
        B("Build the truss rule","Never cut or alter a truss",["sometimes","chord"],"They’re engineered as a whole.")
      ],C)
    ])
  ]);
})();
