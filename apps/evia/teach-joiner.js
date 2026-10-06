/* Teach me: Bench (architectural) Joiner. Each unit has two short lessons (Evia teaches a little, you try it,
   then something new) and a unit challenge with new questions from new angles. */
(function(){
  const {TE,EX,W,CD,Q,T,M,O,G,B,TAP,S,J,SP,N,SC,HOT,LB,QF,CHAL,TROPHY,lesson,unit,add}=window.EVIA_TEACH;
  const C={challenge:true};
  add("joiner",[
    unit("Basic woodworking joints","Woodworking joints",[
      lesson("jn-joints1","Four basic joints","Mortise and tenon, dovetail, bridle and halving",[
        EX("The basic joints","Each joint suits a different job. Tap each one.","joints4",[[40,40,"Mortise and tenon","A tenon (tongue) fits a mortise (slot). Used for door and window frames."],[124,40,"Dovetail","Interlocking tails and pins that resist pulling apart. Used for drawers and boxes."],[203,40,"Bridle","An open mortise, like a fork. Used for frame corners and legs."],[282,40,"Halving","Half the thickness cut from each piece so they sit flush. Used for simple frames."]]),
        M("Match the joint to where it’s used",[["Mortise and tenon","Door and window frames"],["Dovetail","Drawer fronts and boxes"],["Bridle","Frame corners and legs"],["Halving","Simple frames and crossings"]],"Each joint has its job."),
        TE("Tenon thickness","As a rule a tenon is about *a third* of the timber’s thickness. That leaves enough wood either side of the mortise to stay strong.",null,"The one-third rule"),
        Q("The rail is 45 mm thick. About how thick should the tenon be?",["15 mm","45 mm","30 mm","5 mm"],"A third of 45 is 15 mm.",{again:T("A tenon should usually be about a third of the timber’s thickness.",true,"That leaves strong cheeks either side of the mortise.")}),
        TE("Dovetail slope","Dovetails slope about *1 in 6* for softwood and *1 in 8* for hardwood. Too steep and the corners break off; too shallow and it won’t lock."),
        G("A softwood dovetail slopes about 1 in [6], a hardwood one about 1 in [8].",["2","20"],"Softwood 1:6, hardwood 1:8."),
        O("Put making a mortise and tenon in order",["Mark out from the face side and face edge","Gauge the mortise and tenon","Cut the mortise","Cut the tenon cheeks and shoulders","Dry-fit, then glue and cramp"],"Everything is marked from the face side and edge so the parts line up.")
      ]),
      lesson("jn-joints2","Fixings, glue and timber","Dowels, biscuits, adhesives and materials",[
        M("Match the connection",[["Dowels","Round wooden pins glued into holes"],["Biscuits","Oval wafers that swell in slots"],["Staples","Quick fixings for backs and panels"],["PVA","Wood glue, some types water-resistant"]],"Different jobs, different connections."),
        SC("Your supervisor","These external frames need gluing up today.","Which glue do you use?",[["A water-resistant glue, like D4 PVA or polyurethane","Outdoor joints need the right durability rating."],["Standard interior PVA","It isn’t made for outdoor exposure."],["Contact adhesive","That’s for sheet materials, not joints."]]),
        TE("Softwood and hardwood","*Softwoods* come from conifers, like pine, spruce and Douglas fir. *Hardwoods* come from broadleaf trees, like oak, sapele and beech. It’s about the tree, not how hard the wood is."),
        S("Softwood, hardwood or a board?",["Softwood","Hardwood","Board"],[["Redwood (pine)",0,"From a conifer."],["Oak",1,"From a broadleaf tree."],["Plywood",2,"Layers glued with the grain crossing."],["Sapele",1,"An imported hardwood."],["MDF",2,"Fibres glued into a smooth board."],["Douglas fir",0,"A conifer."]]),
        T("Balsa is a hardwood.",true,"It comes from a broadleaf tree, even though it’s soft.",{again:Q("What decides if timber is a hardwood?",["The type of tree it comes from","How hard it is","Its colour","Its price"],"Broadleaf trees give hardwoods.")}),
        TE("Moisture","Joinery timber must be dried to suit where it goes: around 12% for heated indoor work. Wetter timber shrinks and splits after fitting."),
        QF([["Softwoods come from conifers",true],["Oak is a softwood",false],["Dry-fit joints before gluing",true],["Interior PVA is fine outdoors",false]])
      ]),
      lesson("jn-joints3","Unit challenge","Joints and materials",[
        TROPHY(6),
        HOT("Tap the joint you’d use for a drawer front","joints4",[[40,50,34,"First joint"],[124,50,34,"Second joint"],[203,50,34,"Third joint"],[282,50,34,"Fourth joint"]],1,"The dovetail resists the drawer being pulled apart."),
        Q("Timber at 20% moisture is fitted as a skirting in a heated house. What happens?",["It shrinks and may split or open up","Nothing","It swells","It gets stronger"],"It dries out after fitting."),
        SP("Jay’s tenon. Tap the mistake.",["Marked from the face side and edge","Gauged it with a mortise gauge","Made the tenon the full thickness of the rail","Dry-fitted it before gluing"],2,"A tenon should be about a third of the thickness."),
        T("MDF dust needs controlling as it’s fine and harmful to breathe.",true,"Use extraction and a dust mask."),
        N(["Mark out","Cut the mortise and tenon"],["Dry-fit, then glue and cramp","Paint it","Glue it straight away without checking"],"Dry-fit first, while you can still fix problems."),
        B("Build the tenon rule","A tenon is a third of the thickness",["half","width"],"About a third.")
      ],C)
    ]),
    unit("Timber Window",["Timber windows","Drawings"],[
      lesson("jn-window1","Making a casement window","Frame, casement, rebates and weathering",[
        EX("A casement window","The frame is fixed; the casement opens. Tap each part.","window",[[100,15,"Head","The top of the frame."],[25,70,"Jamb","The sides of the frame."],[102,64,"Casement","The opening part, made of stiles and rails."],[60,64,"Glazing","The glass sits in a rebate and is held with beads."],[258,68,"Sill","Sloped (weathered) so water runs off, with a drip underneath."]]),
        TE("Weathering and drips","The sill’s top slopes outwards, called *weathering*, so rain runs away. The *drip groove* underneath stops water creeping back under the sill to the wall.","window","Weathering"),
        HOT("Tap the drip groove","window",[[287,78,9,"Drip groove"],[262,48,13,"Sill top"],[100,127,20,"Front of the sill"],[60,64,26,"Glass"]],0,"Under the sill: water drops off there instead of running back."),
        O("Put making a window in order",["Read the drawing and cutting list","Mark out from the rod","Cut the joints and rebates","Dry-assemble and check it’s square","Glue up, fit ironmongery and glaze"],"Checking square before gluing saves trouble."),
        Q("How do you check a frame is square?",["Measure both diagonals: they should match","Look along it","Use a spirit level","Check one corner only"],"Equal diagonals mean square."),
        T("The sill slopes so rainwater runs away from the window.",true,"That slope is called weathering.")
      ]),
      lesson("jn-window2","Drawings, dust and the environment","Information, protection and sustainability",[
        TE("Drawings and specs","Drawings show sizes and sections; the specification sets the timber, finish and ironmongery. CAD and BIM can produce drawings and cutting lists straight from a model."),
        Q("Where would you find the timber species and finish?",["The specification","The delivery note","The site hoarding","You choose"],"The spec sets materials and standards."),
        M("Match the control",[["LEV","Extracts dust at the machine"],["RPE","A mask that filters what you breathe"],["Dust suppression","Stops dust getting into the air"],["PPE","Protects eyes, ears, hands and feet"]],"Control dust at source first."),
        SC("Replacing an old window","Behind it you find a grey board that could be asbestos.","What do you do?",[["Stop, leave it and tell your supervisor","Never disturb suspected asbestos."],["Break it up and bin it","That releases fibres."],["Sand it smooth","Sanding makes dust."]]),
        J("Good for the environment?",[["Planning cuts to use timber efficiently",true,"Less waste, less cost."],["Burning offcuts on site",false,"Never burn waste on site."],["Choosing FSC or PEFC timber",true,"From well-managed forests."],["Leaving extraction running all night",false,"Switch it off to save energy."]])
      ]),
      lesson("jn-window3","Unit challenge","Windows and drawings",[
        TROPHY(6),
        Q("Water is running back under a new sill and staining the wall. What’s probably missing?",["A drip groove","Glazing beads","A casement","Paint"],"The drip stops water creeping back underneath."),
        LB("Label the window","window",[[40,6,100,12,"Head"],[40,96,25,90,"Jamb"],[150,6,120,40,"Casement"],[296,124,287,78,"Drip"]],"Head and jambs make the frame; the casement opens; the drip is under the sill."),
        T("Equal diagonals mean a frame is square.",true,"Measure both before gluing."),
        SP("Kai’s window. Tap the mistake.",["Read the cutting list","Checked the diagonals","Glued up before a dry fit","Fitted the ironmongery"],2,"Dry-assemble first to find problems."),
        Q("What does RPE stand for?",["Respiratory protective equipment","Real personal equipment","Rapid power extraction","Risk and PPE"],"A mask that filters the air you breathe."),
        B("Build the sill rule","Slope it and add a drip",["flat","paint"],"Weathering and a drip keep water out.")
      ],C)
    ]),
    unit("Straight staircases","Straight staircases",[
      lesson("jn-stairs1","Parts and the rules","Strings, treads, risers and the numbers",[
        EX("A straight flight","Tap each part.","stair",[[152,56,"String","The side board that carries the steps."],[141,38,"Tread","What you step on."],[86,95,"Riser","The upright between treads."],[82,74,"Nosing","The front edge of the tread."]]),
        TE("Rise and going","The *rise* is the height of one step; the *going* is its depth. For private stairs: rise no more than 220 mm, going at least 220 mm, pitch no more than 42°, and twice the rise plus the going between 550 and 700 mm.",null,"2R + G"),
        Q("A private stair has a 200 mm rise and a 250 mm going. Is 2R + G within the rules?",["Yes: 650 mm","No: 450 mm","No: 750 mm","Yes: 450 mm"],"2 × 200 + 250 = 650.",{again:G("2 × 180 + 240 = [600], so it’s within the rules.",["420","780"],"Between 550 and 700.")}),
        Q("The total rise is 2,600 mm with 13 risers. What is each rise?",["200 mm","216 mm","260 mm","130 mm"],"2,600 ÷ 13 = 200 mm."),
        T("All the risers in a flight should be the same height.",true,"Uneven steps are a trip hazard."),
        G("Headroom over a private stair must be at least [2] m.",["1.5","3"],"At least 2 m.")
      ]),
      lesson("jn-stairs2","Cutting lists and working safely","Estimating, talking clearly and height",[
        TE("Cutting lists","A cutting list gives every part: name, number, finished length × width × thickness and material. Add an allowance for planing and trimming when you order."),
        O("Put producing a cutting list in order",["Study the drawing and setting out","List every component","Write the finished sizes and quantities","Add allowances for machining","Total up the material to order"],"Accurate lists stop waste and shortages."),
        Q("Which is the clearest message to a colleague?",["The 2,600 mm stair needs 13 risers of 200 mm: can you check my setting out?","Is it alright?","Check the stairs thing","Sorted?"],"Use the right terms and numbers."),
        TE("Height and voids","Fitting stairs means working near open stairwells: use guardrails or covers and the right access equipment. Lofts and voids need planning, ventilation and someone who knows you’re there."),
        J("Safe on a stair job?",[["Covering the open stairwell while you work",true,"No one can fall through."],["Standing on a chair to reach the top",false,"Use proper access equipment."],["Telling someone before going into a loft void",true,"Someone knows where you are."],["Leaving offcuts on the treads",false,"A trip on a stair is serious."]],["Safe","Not safe"]),
        T("Speaking up when someone is being left out helps an inclusive culture.",true,"Everyone should feel part of the team.")
      ]),
      lesson("jn-stairs3","Unit challenge","Straight staircases",[
        TROPHY(6),
        HOT("Tap the nosing","stair",[[82,74,9,"Front edge"],[86,95,9,"Upright"],[152,56,14,"Side board"],[141,38,11,"Top of a step"]],0,"The front edge of the tread."),
        Q("A stair rises 2,640 mm with 12 risers. What’s each rise, and is it allowed?",["220 mm, the most allowed","200 mm, allowed","240 mm, too steep","264 mm, too steep"],"2,640 ÷ 12 = 220 mm, right at the limit."),
        T("The going must be at least 220 mm on a private stair.",true,"A minimum 220 mm going."),
        SP("Sam’s stair. Tap the mistake.",["Every riser 200 mm","Going of 240 mm","Last riser 180 mm to fit the landing","Headroom of 2.1 m"],2,"Every riser must be the same."),
        Q("Why add allowances to a cutting list?",["Parts are planed and trimmed to size","To make parts bigger","It’s tradition","To use up timber"],"Machining removes material."),
        B("Build the stair rule","Every riser the same height",["most","nosing"],"Uneven steps trip people.")
      ],C)
    ]),
    unit("Door frames and linings","Door frames and linings",[
      lesson("jn-frames1","Frames and linings","The difference, and how they’re made",[
        TE("Frame or lining?","A *door frame* is a heavy section with a rebate cut in for the door, used for external doors. A *door lining* is a thin board lining an internal opening, with a separate stop fixed on.","framelining"),
        M("Match the item",[["Door frame","Heavy section with a rebate"],["Door lining","Thin board lining an internal opening"],["Planted stop","A strip fixed on for the door to close against"],["Horn","Extra length on the head, cut off later"]],"Know which is which."),
        Q("Which would you use for an external door?",["A rebated door frame","A thin lining","No frame","A stair string"],"External doors need a strong, weathered frame."),
        TE("Timber decay","*Wet rot* attacks timber that stays damp. *Dry rot* is a fungus that can spread through masonry. *Woodworm* leaves small exit holes. Fix the damp first, then cut out and replace the decayed timber."),
        S("Which problem is it?",["Wet rot","Dry rot","Woodworm"],[["Soft, dark timber where a gutter leaks",0,"Wet rot, where it stays damp."],["White strands and a mushroom-like growth",1,"Dry rot fungus."],["Small round holes and fine dust",2,"Woodworm exit holes."],["Grey strands spreading across brickwork",1,"Dry rot can travel through masonry."]]),
        T("Replacing rotten timber without fixing the damp usually lasts.",false,"Stop the water, or it will rot again.")
      ]),
      lesson("jn-frames2","Sharp tools and signs","Sharpening and staying safe",[
        TE("Sharpening a chisel","Flatten the back, grind a bevel at about *25°*, then hone a small bevel at about *30°*. Rub the back flat to remove the burr.","chisel"),
        O("Put sharpening a chisel in order",["Flatten the back","Grind the bevel at about 25°","Hone at about 30°","Remove the burr","Test on scrap"],"A sharp tool needs less force, so it’s safer."),
        SC("Kai","This chisel’s blunt, but I’ll just push harder.","What do you say?",[["Sharpen it: blunt tools need more force and slip","Most chisel cuts come from blunt tools slipping."],["Fine, just be careful","Care doesn’t stop a slip."],["Use a hammer on it","That makes slipping more likely."]]),
        CD("Safety signs: flip each one",[[{pic:"sign-eyes"},"Blue circle: must do","A mandatory sign: here, wear eye protection."],[{pic:"sign-nosmoke"},"Red ring: must not","A prohibition sign: here, no smoking."],[{pic:"sign-warn"},"Yellow triangle: warning","There’s a hazard."],[{pic:"sign-firstaid"},"Green square: safe condition","Here, first aid."]]),
        T("Asking to try a new technique under supervision is a good way to learn.",true,"Seek out learning.")
      ]),
      lesson("jn-frames3","Unit challenge","Frames, linings and tools",[
        TROPHY(6),
        HOT("Tap the planted stop","framelining",[[230,54,10,"Small strip"],[240,39,20,"Lining board"],[75,40,26,"Frame"],[206,82,14,"Door"]],0,"The small strip fixed on to the lining."),
        Q("A skirting near a leaking pipe is soft and dark. What first?",["Fix the leak","Paint it","Replace it and leave the leak","Nothing"],"Fix the damp, then replace the rot."),
        T("The honing bevel is a little steeper than the grinding bevel.",true,"About 30° against about 25°."),
        Q("What is a horn on a door frame?",["Extra length on the head, cut off when fitted","A decoration","The stop","A hinge"],"It protects the corners until fitting."),
        SP("Jay’s sharpening. Tap the mistake.",["Flattened the back","Ground a 25° bevel","Left the burr on the edge","Tested it on scrap"],2,"Rub the back flat to remove the burr."),
        B("Build the rule","A sharp tool is a safer tool",["blunt","slower"],"Less force, less slipping.")
      ],C)
    ]),
    unit("Timber doors",["Timber doors","Power tools"],[
      lesson("jn-doors1","Making timber doors","Panelled, ledged and braced, and fire doors",[
        EX("Types of door","Tap each part.","doors",[[35,70,"Stile","The upright at each side of a panelled door."],[75,40,"Muntin","The upright between panels."],[57,99,"Panel","Fits in grooves in the stiles, rails and muntins."],[235,70,"Ledge","A horizontal board the door boards are fixed to."],[235,94,"Brace","A diagonal that stops the door sagging."]]),
        TE("Which way do braces go?","On a ledged and braced door, each brace runs *up and away from the hinges*. The bottom end sits near the hinge side, so the brace pushes the weight back to the hinges.","doors"),
        Q("A door is hung on the left. Where does the bottom of each brace go?",["Near the hinge side","Near the latch side","At the top rail","It doesn’t matter"],"Braces rise away from the hinges, pushing the weight back to them."),
        TE("Fire doors","A fire door, like FD30 (30 minutes), only works as a complete assembly: door, frame, intumescent strips and smoke seals, certified hinges and a self-closer, with the right gaps (usually around 3 mm)."),
        J("Keeps the fire door certified?",[["Fitting the specified intumescent strips",true,"They swell in a fire to seal the gap."],["Cutting in a new lock without approval",false,"Any change must follow the certification."],["Using certified hinges",true,"The whole assembly must be certified."],["Wedging it open for air",false,"It must close by itself."]],["Keeps it","Breaks it"])
      ]),
      lesson("jn-doors2","Power tools and the law","Using, storing and staying safe",[
        M("Match the power tool to a key safety point",[["Circular saw","Guard working and work supported"],["Router","Feed against the cutter’s rotation"],["Nail gun","Sequential trigger; never point it at anyone"],["Planer","Let it stop before putting it down"]],"Every tool has its rules."),
        SC("Changing a router cutter","You’re about to swap the cutter.","What must you do first?",[["Unplug it or take the battery out","So it can’t start while your hands are on it."],["Switch it off at the trigger","A knock can switch it back on."],["Let it slow down","It still has power."]]),
        M("Match the law",[["Health and Safety at Work Act","Duties of employers and employees"],["PUWER","Work equipment is safe and maintained"],["COSHH","Hazardous substances like dust and glue"],["Manual Handling Regulations","Lifting and carrying safely"]],"The main laws on site."),
        J("Good tool care?",[["Storing tools clean and dry with leads coiled",true,"Protects the tool and the next user."],["Leaving a saw plugged in on the bench",false,"Isolate it when not in use."],["Checking the lead before use",true,"Damaged leads are a shock risk."],["Carrying a drill by its lead",false,"It damages the connection."]])
      ]),
      lesson("jn-doors3","Unit challenge","Doors and power tools",[
        TROPHY(6),
        Q("A ledged and braced door sags at the latch side. What’s the likely cause?",["The braces were fitted the wrong way round","Too many ledges","The paint","The hinges are new"],"Braces must rise away from the hinges."),
        T("A fire door can be wedged open if the room is hot.",false,"It must close by itself."),
        Q("What does FD30 mean?",["A fire door rated for 30 minutes","30 mm thick","30 kg","A 30° brace"],"Fire resistance of 30 minutes."),
        SP("Sam’s router job. Tap the mistake.",["Checked the cutter was tight","Clamped the work down","Changed the cutter with it still plugged in","Fed against the rotation"],2,"Isolate the power first."),
        Q("Which regulation says work equipment must be safe and maintained?",["PUWER","COSHH","RIDDOR","CDM"],"Provision and Use of Work Equipment Regulations."),
        B("Build the brace rule","Braces rise away from the hinges",["towards","latch"],"So the weight goes back to the hinges.")
      ],C)
    ]),
    unit("Wall and floor units","Wall and floor units",[
      lesson("jn-units1","Setting out and making units","Rods, marking out and assembly",[
        TE("Setting rods","A *setting rod* is a full-size drawing of the unit’s height, width and depth sections. Parts are marked straight from it, so every joint and length is right.",null,"Setting rod"),
        O("Put making a unit in order",["Draw the setting rod","Produce the cutting list","Mark out from the rod","Cut and machine the parts","Dry-assemble, then glue up"],"The rod is the reference for everything."),
        Q("What are face side and face edge marks for?",["So all marking out comes from the same true faces","To show the best side only","To mark waste","For the customer"],"Measuring from the same faces keeps parts consistent."),
        SC("Fitting a kitchen","The floor falls 12 mm across the run of base units.","What do you do?",[["Use the adjustable legs or packing to get them level","Units must be level even if the floor isn’t."],["Fit them to the floor","The worktop won’t be level."],["Plane the floor","That’s not practical or needed."]]),
        T("Wall units must be fixed into something solid, like studs or proper wall fixings.",true,"A full wall unit is heavy.")
      ]),
      lesson("jn-units2","Dust and working for yourself","Controls, wellbeing and employment",[
        M("Match the equipment",[["LEV","Extracting dust at the source"],["FFP3 mask","Filtering fine dust you breathe"],["Ear defenders","Protecting hearing near machines"],["Safety glasses","Stopping chips reaching your eyes"]],"The right protection for each hazard."),
        TE("Employment","You might be *employed* (PAYE: tax taken from your pay) or *self-employed* (Self Assessment). Under the Construction Industry Scheme (*CIS*), contractors take 20% from a registered subcontractor’s pay, or 30% if unregistered."),
        Q("Under CIS, what’s taken from a registered subcontractor’s pay?",["20%","30%","0%","50%"],"30% if not registered; 0% with gross payment status."),
        M("Match the term",[["PAYE","Tax taken from your wages by your employer"],["Self Assessment","You report and pay your own tax"],["Public liability insurance","Covers injury or damage to others"],["Business plan","What you’ll do and how it pays"]],"Useful if you go self-employed."),
        T("Taking proper breaks is part of putting wellbeing first.",true,"Tired people make mistakes.")
      ]),
      lesson("jn-units3","Unit challenge","Units and working life",[
        TROPHY(5),
        Q("A part was cut 10 mm short because it was measured from the wrong edge. What would have prevented it?",["Marking out from the face side and edge, against the rod","A sharper saw","Sanding","Nothing"],"Always measure from the same reference faces."),
        T("Under CIS an unregistered subcontractor has 30% taken.",true,"20% if registered."),
        N(["Draw the setting rod","Produce the cutting list"],["Mark out from the rod","Glue up","Fit the handles"],"Then cut, machine and assemble."),
        SP("Kai’s kitchen fit. Tap the mistake.",["Checked the wall for services","Levelled the base units on their legs","Fixed the wall units to plasterboard only","Checked the worktop was level"],2,"Heavy units need proper fixings into something solid."),
        B("Build the rule","Mark everything from the rod",["guess","later"],"The rod is the reference.")
      ],C)
    ]),
    unit("Timber mouldings","Materials",[
      lesson("jn-mould1","Mouldings and finishes","Profiles, machining and finishing",[
        EX("Where mouldings go","Tap each one.","mouldings",[[60,24,"Picture rail","Near the top of the wall, for hanging pictures."],[60,82,"Dado rail","Part way up, protecting the wall from chair backs."],[60,127,"Skirting","Along the bottom, covering the joint with the floor."],[199,80,"Architrave","Around a door or window, covering the gap to the wall."]]),
        TE("Machining","Mouldings are shaped on a spindle moulder or router. Keep the profile consistent and machine with the grain so it doesn’t tear out."),
        TE("Finishing","Sand through the grits (like 80, 120 then 180). Seal knots with *knotting* before priming. Then primer, undercoat and top coat, or a stain, varnish or oil.",null,"Knotting"),
        O("Put a painted finish in order",["Fill and sand smooth","Apply knotting to knots","Prime","Undercoat","Top coat"],"Each coat does a different job.",{again:Q("Why seal knots before painting?",["Resin in knots bleeds through paint","To darken them","To waterproof them","It isn’t needed"],"Knotting stops resin staining the finish.")}),
        T("Sanding across the grain gives the best finish.",false,"Sand with the grain, or scratches show through.")
      ]),
      lesson("jn-mould2","Sustainability and wellbeing","Forests, waste and looking after yourself",[
        TE("Sustainable timber","*FSC* and *PEFC* marks show timber comes from well-managed forests. Use offcuts, recycle clean timber and dispose of treated or painted waste properly."),
        S("What do you do with it?",["Reuse or recycle","Special disposal"],[["Clean offcuts",0,"Reuse for small parts or recycle."],["Treated timber",1,"Dispose of as specified; don’t burn it."],["Empty paint tins",1,"Hazardous waste, as marked."],["Sawdust",0,"Bagged, it can be reused."]]),
        TE("Wellbeing","Strain, stress and long days add up. Talk to someone, use your employer’s support or a mental health first aider, or call the Construction Industry Helpline."),
        SC("At break","A friend says they can’t sleep and feel low.","What’s a good first step?",[["Listen, and help them find support","Listening and pointing to help really matters."],["Tell them to toughen up","That can make it worse."],["Change the subject","They may not raise it again."]]),
        T("Switching off machines and extraction when not in use helps the environment.",true,"It saves energy and money.")
      ]),
      lesson("jn-mould3","Unit challenge","Mouldings and materials",[
        TROPHY(5),
        HOT("Tap the dado rail","mouldings",[[60,24,10,"Top rail"],[60,82,10,"Middle rail"],[60,127,10,"Bottom board"],[199,80,12,"Around the door"]],1,"Part way up the wall."),
        Q("Brown stains have come through the white paint over knots. What was missed?",["Knotting","Undercoat","Sanding","Filler"],"Knots need sealing before priming."),
        T("FSC timber comes from well-managed forests.",true,"Look for it when ordering."),
        SP("Jay’s finish. Tap the mistake.",["Sanded 80, 120, then 180","Sanded across the grain to speed up","Applied knotting","Primed before the undercoat"],1,"Sand with the grain."),
        B("Build the paint order","Prime then undercoat then top coat",["first","varnish"],"Each coat has its job.")
      ],C)
    ]),
    unit("Staircase spindles and balustrades","Staircase spindles",[
      lesson("jn-bal1","Balustrades and jigs","Parts, the 100 mm rule and repeat cuts",[
        EX("A balustrade","Tap each part.","balustrade",[[38,70,"Newel post","The main post at each end of the flight."],[150,18,"Handrail","What you hold, about 900 mm above the pitch line on a house stair."],[128,64,"Spindle","The uprights filling the balustrade."],[200,95,"Baserail","The bottom rail the spindles sit in."],[73,64,"The 100 mm rule","No gap can let a 100 mm sphere through, so a child can’t get stuck or fall through."]]),
        G("Gaps in a balustrade must not let a [100] mm sphere through.",["150","200"],"Under 100 mm."),
        TE("Jigs","A *jig* holds or guides work so repeated cuts come out identical, like cutting every spindle end at the stair pitch. Faster, more accurate, and it keeps your hands clear.",null,"Jig"),
        Q("Why make a jig for cutting 20 spindles?",["Every cut is the same, quickly and safely","It looks professional","It uses more timber","It isn’t worth it"],"Jigs are ideal for repeat work."),
        T("A domestic handrail sits about 900 mm above the pitch line.",true,"About 900 mm.")
      ]),
      lesson("jn-bal2","Awareness, teamwork and inclusion","Working safely with others",[
        J("Safe workshop?",[["Clearing offcuts from the floor as you go",true,"Fewer trips."],["Trailing leads across the walkway",false,"Route them out of the way."],["Warning others before moving a long board",true,"People know to step aside."],["Starting a machine while someone’s behind you",false,"Check around you first."]],["Safe","Not safe"]),
        M("Match the teamwork habit",[["Communicating","Warning others before moving a long board"],["Reliability","Finishing what you said you would"],["Helping","Lending a hand with a heavy lift"],["Respect","Listening to other people’s ideas"]],"Good teams do all four."),
        SC("On a new job","A new starter is being left out of breaks and chat.","What could you do?",[["Include them and introduce them to the team","Small actions build an inclusive team."],["Leave them to it","They may feel isolated."],["Join in leaving them out","That’s not acceptable."]]),
        T("Good team working means only looking after your own job.",false,"Teams succeed together.")
      ]),
      lesson("jn-bal3","Unit challenge","Balustrades",[
        TROPHY(5),
        HOT("Tap the newel post","balustrade",[[38,70,12,"Left post"],[150,18,14,"Top rail"],[128,64,8,"Upright"],[200,95,12,"Bottom rail"]],0,"The main post at the end."),
        Q("Spindles are set 120 mm apart (the gap). Is that allowed?",["No: a 100 mm sphere would pass through","Yes","Only on a loft stair","Only outdoors"],"Gaps must stop a 100 mm sphere."),
        T("A jig makes repeated cuts identical.",true,"And keeps hands away from the blade."),
        SP("Kai’s balustrade. Tap the mistake.",["Handrail about 900 mm above the pitch line","Spindles cut with a jig","Spindle gaps of 110 mm","Newels fixed firmly"],2,"Gaps must be under 100 mm."),
        B("Build the rule","No gap bigger than 100 mm",["over","150"],"To protect children.")
      ],C)
    ]),
    unit("Ironmongery","Ironmongery",[
      lesson("jn-iron1","Fitting ironmongery","Hinges, locks, handles and runners",[
        TE("Where things go","Hang doors on butt hinges about *150 mm* from the top and *225 mm* from the bottom, with a third hinge on heavy or fire doors. Handles usually sit about 1,000 mm from the floor.","hinges"),
        HOT("Tap where the top hinge goes","hinges",[[110,22,12,"Top hinge"],[110,114,12,"Bottom hinge"],[180,80,12,"Handle"],[150,70,18,"Middle of the door"]],0,"About 150 mm from the top."),
        O("Put fitting a mortice latch in order",["Mark the height and centre on the door edge","Drill and chisel the mortice","Fit the latch and mark the faceplate","Drill for the spindle and fit the handles","Fit the striking plate on the frame"],"Mark carefully: mistakes in a door are hard to hide."),
        SC("A new chest of drawers","One drawer won’t close smoothly.","What’s the likely cause?",[["The runners aren’t level or parallel","Check both runners with a level and measure between them."],["The handle is too big","Handles don’t affect the runners."],["It needs paint","Paint won’t fix the runners."]]),
        T("Fire doors often need three hinges.",true,"Always follow the door’s certification.")
      ]),
      lesson("jn-iron2","Hand tools, standards and fairness","Tools, regulations and inclusion",[
        M("Match the hand tool",[["Mortise gauge","Marks both sides of a mortise at once"],["Sliding bevel","Sets out and copies angles"],["Try square","Checks and marks right angles"],["Smoothing plane","Final smoothing of a surface"]],"The right tool for each job."),
        Q("How should chisels be stored?",["With edge guards, in a roll or rack","Loose in a bucket","Edge down on a bench","In a wet toolbox"],"Protecting the edge keeps it sharp and you safe."),
        M("Match the standard",[["British Standards","Agreed ways to make and fit things"],["Building Regulations","Legal requirements for buildings"],["Warranty standards","Quality rules for new homes"],["Manufacturer’s instructions","How to fit that product"]],"Different rules, different jobs."),
        Q("Which is an example of equity at work?",["Adjusting how training is given so everyone can take part","Treating everyone exactly the same whatever their needs","Only training the fastest","Letting people sort themselves out"],"Equity means fair access, which may need different support."),
        T("Asking for feedback on your work helps you improve.",true,"Ask what you could do better.")
      ]),
      lesson("jn-iron3","Unit challenge","Ironmongery",[
        TROPHY(5),
        Q("The bottom hinge usually goes about how far from the bottom?",["225 mm","150 mm","50 mm","500 mm"],"About 225 mm."),
        T("The striking plate is fitted to the frame.",true,"The latch closes into it."),
        N(["Mark the height and centre","Drill and chisel the mortice","Fit the latch"],["Drill for the spindle and fit the handles","Hang the door","Paint it"],"Then fit the striking plate."),
        SP("Sam’s door. Tap the mistake.",["Hinges 150 mm and 225 mm from the ends","A third hinge on the fire door","Handle fitted at 1,500 mm","Striking plate lined up with the latch"],2,"Handles usually sit about 1,000 mm up."),
        B("Build the rule","Mark twice and cut the mortice once",["thrice","hinge"],"Door mistakes are hard to hide.")
      ],C)
    ]),
    unit("Fixed Machinery","Fixed machinery",[
      lesson("jn-mach1","Fixed machines","Inspect, prepare and operate safely",[
        M("Match the machine to its job",[["Crosscut saw","Cutting timber to length"],["Band saw","Curves and deep cuts"],["Planer and thicknesser","Flat, square and to thickness"],["Mortiser","Cutting mortises"]],"Only use them when trained and authorised."),
        TE("Guards","Set the band saw’s top guard *just above the work*, so as little blade as possible is exposed. Use push sticks when your hands would come near the blade.","bandsaw"),
        O("Put using a machine in order",["Check you’re trained and authorised","Inspect guards, blades and extraction","Set up and adjust the guard","Use push sticks to keep hands clear","Isolate the machine when finished"],"Isolate before any adjustment or blade change."),
        SC("In the workshop","The planer’s guard is cracked.","What do you do?",[["Don’t use it; isolate it and report it","PUWER says equipment must be safe to use."],["Use it carefully","A cracked guard can fail."],["Tape it up","Tape isn’t a repair."]]),
        T("A push stick keeps your hands clear of the blade.",true,"Never feed small pieces by hand.")
      ]),
      lesson("jn-mach2","Fire, safe systems and modern methods","Workshop safety and how buildings are made",[
        HOT("Tap the extinguisher for an electrical fire","extinguishers",[[40,62,28,"Red"],[120,62,28,"Cream"],[200,62,28,"Black"],[280,62,28,"Blue"]],2,"CO2, with the black band."),
        Q("Why is a dusty workshop a fire risk?",["Fine dust burns easily and can even explode","Dust is damp","Dust puts fires out","It isn’t"],"Keep extraction working and the shop clean."),
        M("Match the document",[["Risk assessment","Finds hazards and controls"],["Method statement","The safe way to do the job"],["Toolbox talk","A short safety briefing"],["Induction","The rules when you start"]],"Read them before you start."),
        TE("Modern methods","Timber frame panels, SIPs, cross-laminated timber and volumetric modules are made in factories and put together on site. Joinery for them has to be accurate: there’s little room to adjust."),
        T("Leaving a machine clean and set safely helps the next person.",true,"Good habits protect everyone.")
      ]),
      lesson("jn-mach3","Unit challenge","Fixed machinery",[
        TROPHY(5),
        HOT("Tap the part that should sit just above the work","bandsaw",[[184,53,10,"Guard"],[125,71,9,"Table"],[166,120,18,"Base"],[166,16,14,"Top of the wheel housing"]],0,"The top guard."),
        Q("Which machine makes timber flat, square and to thickness?",["Planer and thicknesser","Band saw","Mortiser","Crosscut saw"],"Flat, square, then to thickness."),
        T("You can change a blade with the machine switched off at the start button.",false,"Isolate it at the supply first."),
        SP("Jay’s machine check. Tap the mistake.",["Checked he was authorised","Checked the extraction","Set the band saw guard at its highest","Used a push stick"],2,"The guard goes just above the work."),
        B("Build the rule","Isolate before you adjust anything",["after","start"],"So it can’t start.")
      ],C)
    ])
  ]);
})();
