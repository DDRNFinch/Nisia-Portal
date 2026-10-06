/* Evia7 brain: what makes Evia's chat useful without an AI service. Everything is worked out on the phone, from
   Evia's own content, so it's instant, free, works offline and every answer can be checked.
     Today       the learner's day: up to three things to do now, most urgent first, each one tap into the app.
     Ask Evia    typed questions: site calculations (bricks, blocks, mortar, concrete, stairs, falls, 3-4-5, areas,
                 conversions and sums), tools, materials and site terms (the glossary, with Teach me pictures),
                 KSBs in plain English with where the learner is on each, "what should I do next?", how to do
                 things in the app, and anything in the Teach me lessons. She remembers the last calculation, so
                 "what about 6 m?" works, and ends each answer with what to ask next.
     Calculators interactive cards: change a number and the answer and the working update as you type.
   window.eviaBrain: answer(text), todayCard(), calculators(), open(kind), suggest(), calc (the maths, for tests). */
(function(){
  const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const K=()=>window.eviaChatKit;
  const trade=()=>typeof course!=="undefined"?course:"bricklayer";
  const timber=()=>["site","joiner"].includes(trade());
  const nf=(n,dp)=>Number(n).toLocaleString("en-GB",{maximumFractionDigits:dp==null?2:dp,minimumFractionDigits:0});
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const ICON={
    bell:'<svg viewBox="0 0 24 24"><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15Z"/><path d="M10 20.5a2 2 0 0 0 4 0"/></svg>',
    calc:'<svg viewBox="0 0 24 24"><rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8 7h8M8.5 11h.01M12 11h.01M15.5 11h.01M8.5 14.5h.01M12 14.5h.01M15.5 14.5h.01M8.5 18h.01M12 18h3.5"/></svg>',
    book:'<svg viewBox="0 0 24 24"><path d="M5 4.5h9a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z"/><path d="M8 16.5h9"/></svg>',
    ksb:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M8.5 12.5l2.4 2.4 4.6-5"/></svg>',
    go:'<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
    sun:'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/></svg>',
    tick:'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'
  };

  /* ---------- The glossary: tools, materials and site terms, in plain words ----------
     [term, other names, what it is, Teach me picture, trades ("b" brick, "t" timber, "*" everyone)] */
  const G=[
    /* Bricklaying tools */
    ["Brick trowel",["trowel","laying trowel"],"The main laying tool: a large steel blade for spreading mortar beds and buttering perps. The edge can also cut bricks roughly.","tools","b"],
    ["Pointing trowel",["pointer"],"A small trowel for pointing and filling joints, and for fiddly work where the brick trowel is too big.","tools","b"],
    ["Bolster",["brick bolster","bolster chisel"],"A wide steel chisel used with a club hammer to cut bricks and blocks cleanly: score all round, then one firm strike on the waste side. Wear eye protection and gloves.","bolster","b"],
    ["Club hammer",["lump hammer"],"A heavy two-faced hammer used to drive a bolster or chisel. Not for nails.","bolster","b"],
    ["Brick hammer",["walling hammer"],"A hammer with a square head on one side and a chisel blade on the other, for trimming and rough-cutting bricks.","tools","b"],
    ["Scutch hammer",["scutch","comb hammer"],"A hammer that takes replaceable combs (scutches) for trimming the edges of cut bricks and blocks neatly.","tools","b"],
    ["Spirit level",["level","boat level"],"Checks work is level (horizontal) and plumb (vertical) using a bubble between two lines. Check it's accurate by turning it end for end.","level","*"],
    ["Line and pins",["line pins","string line","line"],"A builder's line stretched between pins pushed into the joints, so each course is laid straight and level between the corners.","tools","b"],
    ["Line blocks",["corner blocks"],"Blocks that hook over the ends of a wall to hold the builder's line tight at the right course height, without pins in the joints.","tools","b"],
    ["Tingle plate",["tingle"],"A small plate that supports a long builder's line in the middle to stop it sagging.","tools","b"],
    ["Gauge rod",["storey rod"],"A timber rod marked every 75 mm (one brick and joint) to check each course is at the right height. Openings and DPC levels can be marked on it too.","gaugerod","b"],
    ["Jointer",["brick jointer","jointing iron","half round jointer"],"A tool pressed along a mortar joint when it's thumb-print hard to make a neat, compressed finish, such as a half-round (bucket handle) joint.","joints4","b"],
    ["Profile boards",["profiles"],"Boards set up clear of the work, with the building lines marked on them by saw cuts or nails, so lines can be restrung after digging.","profiles","*"],
    ["Corner profiles",["profile"],"Metal uprights clamped at the corners of a wall, marked in courses, that hold the line so you don't need to build the corners first.","profiles","b"],
    ["Spot board",["mortar board"],"A board raised up near the work to hold mortar, so it's at a comfortable height and stays clean.","tools","b"],
    ["Mixer",["cement mixer","drum mixer"],"A powered drum for mixing mortar or concrete. Guards on, never put tools or hands in the drum while it's turning, and clean it out at the end.","mixer","b"],
    ["Silo mortar",["silo"],"Mortar supplied in a site silo: dry ready-batched materials mixed with water at the silo, so every batch is consistent.","silo","b"],
    ["Pre-mixed mortar",["premix","pre-mix","ready mixed mortar","retarded mortar"],"Mortar delivered ready mixed, often retarded so it stays workable for the day. Keep it covered.","premix","b"],
    /* Bricklaying materials and terms */
    ["Mortar",[],"The mix that bonds bricks and blocks: sand, cement (and sometimes lime or plasticiser) and water. A common general mix is 1:4 or 1:5 cement to sand; always follow the specification.","ingredients","b"],
    ["Cement",["opc","portland cement"],"The binder in mortar and concrete. It reacts with water and sets hard. It's an irritant: wear gloves, and wash it off skin straight away.","ingredients","b"],
    ["Building sand",["soft sand"],"Fine, soft sand used for mortar. Sharp sand is coarser and used for concrete and screeds.","ingredients","b"],
    ["Sharp sand",["grit sand","concreting sand"],"Coarse sand used for concrete, screeds and paving beds, not usually for bricklaying mortar.","ingredients","*"],
    ["Lime",["hydrated lime"],"Added to mortar to make it more workable and slightly flexible. Used on its own in older buildings. It's caustic: gloves and eye protection.","bucket-lime","b"],
    ["Plasticiser",["mortar plasticiser"],"A liquid added to mortar to make it more workable. Use the amount on the label; too much weakens the mortar.","ingredients","b"],
    ["Ratio",["mix ratio","mortar ratio"],"How much of each material goes in a mix, by volume: 1:4 means 1 part cement to 4 parts sand, measured with the same bucket (gauging).","ratio","*"],
    ["Gauging",["gauge box","gauge buckets"],"Measuring mix materials by volume, with a bucket or gauge box, so every batch is the same strength and colour.","gauge","b"],
    ["Stretcher",[],"A brick laid lengthways, with its long face (215 mm) showing in the wall.","bonds","b"],
    ["Header",[],"A brick laid across the wall, with its end (102.5 mm) showing in the face.","bonds","b"],
    ["Frog",[],"The indent in the top of some bricks. Usually laid frog up and filled with mortar, for strength and sound insulation.","bonds","b"],
    ["Closer",["queen closer","king closer"],"A cut brick used near the end of a course to keep the bond correct. A queen closer is a brick cut in half along its length.","bonds","b"],
    ["Bat",["half bat","three quarter bat"],"A brick cut across its length, such as a half bat (half a brick) or three-quarter bat.","bonds","b"],
    ["Perpend",["perp","perps","cross joint"],"The vertical joint between two bricks. Perps should line up every other course and be fully filled.","joints","b"],
    ["Bed joint",["bed"],"The horizontal mortar joint a course is laid on. Normally 10 mm, giving 75 mm courses.","joints","b"],
    ["Stretcher bond",["half bond","running bond"],"The most common bond: all stretchers, each course lapped by half a brick. Used for half-brick walls such as the outer leaf of a cavity wall.","bonds","b"],
    ["English bond",[],"Alternate courses of all stretchers and all headers. Very strong: used for one-brick walls, piers and manholes.","bonds","b"],
    ["Flemish bond",[],"Each course has a header and a stretcher alternating. A decorative bond for one-brick walls.","bonds","b"],
    ["Cavity wall",["cavity"],"Two leaves of masonry (usually brick outside, block inside) with a gap between, tied together with wall ties. The cavity stops damp crossing and holds insulation.","cavity","b"],
    ["Wall ties",["ties","cavity ties"],"Stainless steel or plastic ties that bridge the cavity and hold the two leaves together. Typically every 900 mm along and 450 mm up, staggered, with extra ties at openings.","cavity","b"],
    ["DPC",["damp proof course","damp-proof course"],"A waterproof layer built into a wall at least 150 mm above the ground to stop rising damp.","dpc150","b"],
    ["DPM",["damp proof membrane"],"A waterproof sheet under a floor slab to stop damp coming up through the floor. It laps with the DPC in the wall.","dpc150","*"],
    ["Lintel",["lintels"],"A beam over an opening (door or window) that carries the wall above. Must have the right bearing each end, usually at least 150 mm.","opening","b"],
    ["Cavity tray",["tray"],"A waterproof tray built into a cavity wall above an opening or roof junction, sloping outwards, to lead water out through weep holes.","opening","b"],
    ["Weep vent",["weep hole","weeps"],"A gap or vent in a perp joint, above a tray or DPC, that lets water in the cavity drain out.","opening","b"],
    ["Cavity closer",["closer at the reveal"],"An insulated closer that shuts off the cavity at the sides of an opening, stopping damp and heat loss.","opening","b"],
    ["Insulation batts",["cavity batts","batts"],"Insulation boards or slabs built into the cavity as the wall goes up. Keep them clean and tight to the inner leaf.","cavity","b"],
    ["Coping",["copings"],"The top of a free-standing wall, shaped and overhanging with drip grooves to throw water off the wall.","coping","b"],
    ["Capping",[],"A top finish to a wall that sits flush (no overhang), unlike a coping.","coping","b"],
    ["Soldier course",["soldiers"],"A course of bricks stood on end, side by side. Often used as a decorative band or over openings.","soldier","b"],
    ["Pier",["piers","attached pier"],"A thickened section of wall that stiffens it or carries a load, often at the ends or at intervals along a garden wall.","piers","b"],
    ["Gable",["gable end","raked wall"],"The triangular top of an end wall under a pitched roof. The brickwork is raked to follow the roof slope.","gable","b"],
    ["Movement joint",["expansion joint"],"A vertical gap left through a wall and filled with a compressible filler and sealant, so the wall can expand and shrink without cracking.","movement","b"],
    ["Efflorescence",[],"A white powdery deposit on new brickwork, caused by salts coming out as the wall dries. It usually brushes off and fades.","defects","b"],
    ["Spalling",[],"When the face of a brick breaks away, usually from frost acting on a saturated brick or from rusting metal.","defects","b"],
    ["Bucket handle joint",["half round joint","concave joint"],"A curved, pressed joint made with a half-round jointer. It sheds water well and is the most common finish.","joints4","b"],
    ["Weather struck joint",["struck joint"],"A joint sloped outwards from top to bottom, so rain runs off the brick below.","joints4","b"],
    ["Recessed joint",["raked joint"],"A joint set back from the face. It looks sharp but holds water, so it's not for exposed walls.","joints4","b"],
    ["Flush joint",[],"A joint finished level with the face of the brick.","joints4","b"],
    ["Gauge",["75 mm gauge","brick gauge"],"The regular course height: 65 mm brick plus 10 mm joint makes 75 mm per course, so 4 courses make 300 mm.","course75","b"],
    ["Plumb",[],"Truly vertical. Walls, reveals and corners are checked for plumb with a level.","level","*"],
    ["Datum",["datum point","ffl"],"A fixed reference height that all levels on site are measured from, such as finished floor level (FFL).","profiles","*"],
    ["Setting out",["set out"],"Marking where the work goes: building lines, corners, openings and levels, from the drawings, before building starts.","profiles","*"],
    ["3-4-5",["3 4 5","345","pythagoras"],"A way to set out a square (90°) corner: measure 3 along one side and 4 along the other; when the diagonal is exactly 5, the corner is square. Works with any multiple (0.9, 1.2, 1.5 m).","345","*"],
    ["Blocks",["concrete blocks","blockwork","thermal blocks","aircrete"],"Large masonry units, usually 440 × 215 mm faces, used for inner leaves and partitions. Heavy ones need two-person lifts.","wall-est","b"],
    ["Thin joint",["thin joint blockwork"],"Blockwork laid with a thin (2 to 3 mm) adhesive mortar instead of a 10 mm bed. Quick to build, but the first course must be perfectly level.","thinjoint","b"],
    ["Arch",["arches","soldier arch"],"Brickwork shaped over an opening that carries the load round to the sides. Built on a temporary support called a centre.","arch","b"],
    ["Corbel",["corbelling"],"Courses stepped out past the face below, each one projecting a little further.","corbel","b"],
    ["Repointing",["repoint"],"Raking out old, failed mortar joints and filling them with fresh mortar to match.","repoint","b"],
    /* Carpentry and joinery tools */
    ["Tenon saw",["back saw"],"A small saw with a stiffened back, for accurate cuts such as tenon shoulders and joints.","chisel","t"],
    ["Panel saw",["hand saw"],"A hand saw for cutting sheet material and timber to size.","chisel","t"],
    ["Coping saw",[],"A saw with a thin blade in a frame, for cutting curves and scribing mouldings.","mouldings","t"],
    ["Chisel",["bevel edge chisel","firmer chisel"],"A sharp steel blade for cutting and paring timber. Keep both hands behind the edge and the work held down.","chisel","t"],
    ["Mortice chisel",[],"A heavy chisel with a thick blade, made to be struck with a mallet to chop out mortices.","chisel","t"],
    ["Mallet",[],"A wooden or plastic hammer used to strike chisels without damaging the handle.","chisel","t"],
    ["Marking gauge",["gauge"],"A tool with a pin that scribes a line parallel to an edge, for marking out thicknesses.","chisel","t"],
    ["Mortice gauge",[],"A marking gauge with two pins, set to the chisel width, to mark both sides of a mortice or tenon at once.","chisel","t"],
    ["Try square",["square","combination square"],"Checks and marks 90° angles against an edge.","square","t"],
    ["Sliding bevel",["bevel"],"An adjustable square that copies and marks any angle.","square","t"],
    ["Plane",["jack plane","smoothing plane","block plane"],"A tool with an adjustable blade for shaving timber to size and a smooth finish. Plane with the grain.","chisel","t"],
    ["Router",[],"A power tool with a spinning cutter for grooves, rebates, housings and moulded edges. Take shallow passes, and wear eye and hearing protection.","mouldings","t"],
    ["Mitre saw",["chop saw","compound mitre saw"],"A power saw on a pivoting arm for accurate crosscuts and mitres. Let the blade stop before lifting it.","mouldings","t"],
    ["Circular saw",["circ saw","skill saw"],"A hand-held power saw with a round blade for straight cuts in timber and sheets. Support the work so it doesn't pinch the blade.","chisel","t"],
    ["Band saw",["bandsaw"],"A workshop machine with a continuous blade for curves and deep cuts. Guard set just above the work, and use a push stick.","bandsaw","t"],
    ["Jigsaw",[],"A hand-held power saw with a short upright blade, for curves and cut-outs.","chisel","t"],
    ["Claw hammer",["hammer"],"A hammer for driving nails, with a split claw for pulling them out.","tools","t"],
    ["Nail punch",["nail set"],"A punch for sinking nail heads just below the surface so they can be filled.","tools","t"],
    ["Bradawl",["awl"],"A small pointed tool for making starter holes for screws and nails.","tools","t"],
    ["Pilot hole",["pilot"],"A small hole drilled before a screw so the timber doesn't split, especially near ends and in hardwood.","tools","t"],
    ["Countersink",["countersunk"],"A cone-shaped recess so a screw head sits flush with the surface.","tools","t"],
    /* Carpentry and joinery joints and terms */
    ["Mortice and tenon",["mortise and tenon","mortice","tenon"],"A strong framing joint: a tongue (tenon) on one piece fits a slot (mortice) cut in the other. Used for doors and frames.","chisel","t"],
    ["Dovetail",["dovetail joint"],"A joint of interlocking fan-shaped tails and pins that can't pull apart one way. Used for drawers and quality boxes.","chisel","t"],
    ["Housing joint",["housing","trench"],"A groove cut across one piece for the end of another to sit in, such as shelves and stair treads into strings.","chisel","t"],
    ["Halving joint",["halving"],"A joint where each piece has half its thickness cut away so they fit flush.","chisel","t"],
    ["Bridle joint",[],"A joint like an open mortice and tenon, used for frame corners.","chisel","t"],
    ["Scribe",["scribed joint","scribing"],"Cutting one piece to the exact shape of another, such as skirting on an inside corner, so it stays tight as timber moves.","mouldings","t"],
    ["Mitre",["mitre joint"],"Two pieces cut at matching angles (usually 45°) to meet at a corner, such as architrave.","mouldings","t"],
    ["Stud wall",["stud partition","partition"],"A non-masonry wall made of timber or metal studs between a head plate and sole plate, lined with plasterboard.","studwall","t"],
    ["Stud",["studs"],"An upright in a stud wall, usually at 400 or 600 mm centres so board edges land on one.","studwall","t"],
    ["Nogging",["noggin","noggings"],"A short piece fixed between studs or joists to stiffen them and give fixings for boards and fittings.","studwall","t"],
    ["Sole plate",["sole piece"],"The bottom timber of a stud wall, fixed to the floor.","studwall","t"],
    ["Head plate",["head binder"],"The top timber of a stud wall, fixed to the ceiling or joists.","studwall","t"],
    ["Joist",["floor joist","ceiling joist"],"One of the parallel timbers that carry a floor or ceiling, set on edge at regular centres.","joist","t"],
    ["Joist hanger",["hanger"],"A galvanised steel stirrup that supports a joist end off a wall or beam, nailed in every hole.","hanger","t"],
    ["Herringbone strutting",["strutting","solid strutting"],"Crossed timber struts fixed between joists to stop them twisting and to spread loads.","joist","t"],
    ["Rafter",["rafters","common rafter"],"A sloping roof timber running from the wall plate to the ridge.","cutroof","t"],
    ["Wall plate",[],"A timber bedded on top of a wall that the rafters or joists sit on and are fixed to.","cutroof","t"],
    ["Ridge",["ridge board"],"The top horizontal board or beam of a pitched roof, where the rafters meet.","cutroof","t"],
    ["Purlin",[],"A horizontal beam part-way up a roof slope that supports the rafters.","cutroof","t"],
    ["Fascia",[],"The board fixed along the ends of the rafters, which the gutter is fixed to.","cutroof","t"],
    ["Soffit",[],"The board under the eaves, between the fascia and the wall.","cutroof","t"],
    ["Architrave",[],"The moulded trim round a door or window lining that covers the joint with the plaster. Usually mitred at the top corners.","mouldings","t"],
    ["Skirting",["skirting board"],"The board along the bottom of a wall that covers the joint with the floor and protects the wall. Scribe the inside corners.","mouldings","t"],
    ["Door lining",["lining"],"The timber frame fixed into an opening in an internal wall that the door hangs in.","framelining","t"],
    ["Door frame",["frame"],"A heavier frame, usually with a rebate, for external doors or where more strength is needed.","framelining","t"],
    ["Door stop",["stop","stop bead"],"The strip fixed round a lining that the door closes against.","doors","t"],
    ["Hinges",["butt hinges","hinge"],"Usually hung about 150 mm from the top and 225 mm from the bottom, with a third hinge for heavy or fire doors.","hinges","t"],
    ["Ironmongery",["door furniture"],"Hinges, locks, latches, handles and other door and window hardware.","hinges","t"],
    ["Stair string",["string","strings"],"The boards each side of a staircase that carry the treads and risers, housed into them.","stair","t"],
    ["Tread",["treads"],"The part of a step you stand on.","stair","t"],
    ["Riser",["risers"],"The upright part between two treads. On a private stair the rise is at most 220 mm.","stair","t"],
    ["Going",[],"The horizontal depth of a step from nosing to nosing. On a private stair it's at least 220 mm.","stair","t"],
    ["Nosing",[],"The front edge of a tread, which overhangs the riser below.","stair","t"],
    ["Winder",["winders"],"A tapered tread that turns a staircase round a corner.","stair","t"],
    ["Newel post",["newel"],"The large post at the end or turn of a staircase that supports the handrail and strings.","balustrade","t"],
    ["Baluster",["balusters","spindles","spindle"],"The upright bars under a handrail. The gaps must not let a 100 mm sphere through.","balustrade","t"],
    ["Handrail",[],"The rail you hold on a stair, at 900 to 1000 mm above the pitch line on a private stair.","balustrade","t"],
    ["First fix",[],"Carpentry done before plastering: joists, stud walls, linings, roof timbers and boxing in.","studwall","t"],
    ["Second fix",[],"Carpentry done after plastering: doors, skirting, architrave, ironmongery and kitchens.","doors","t"],
    ["PAR",["planed all round"],"Timber planed smooth on all four faces, so it's a few millimetres smaller than its sawn size (50 × 100 becomes about 44 × 94).","chisel","t"],
    ["C24",["c16","strength grade","structural timber"],"Strength grades for structural softwood: C24 is stronger than C16. Joists and rafters must be the grade on the drawings.","joist","t"],
    ["MDF",["medium density fibreboard"],"A smooth board made of wood fibres, good for painted mouldings and panels. Its dust is harmful: use extraction and a mask.","mouldings","t"],
    ["Plywood",["ply"],"A strong board made of thin wood layers glued with the grain alternating. Different grades for inside, outside and structural use.","cladding","t"],
    ["OSB",["oriented strand board","sterling board"],"A board made from large wood strands, used for sheathing, flooring and roofing.","cladding","t"],
    ["Moisture content",["mc"],"How much water is in timber. Joinery for a heated home should be about 10 to 12%, or it will shrink and gap.","chisel","t"],
    ["Cladding",["timber cladding","feather edge"],"Boards fixed to the outside of a wall to weatherproof it, with gaps for ventilation behind.","cladding","t"],
    ["Boxing in",["boxing"],"A timber frame and board covering pipes or services, with access panels where needed.","boxing","t"],
    ["Window board",["window sill"],"The internal board at the bottom of a window opening.","windowboard","t"],
    /* Safety and site terms: everyone */
    ["PPE",["personal protective equipment"],"Kit that protects you: hard hat, hi-vis, safety boots, gloves, eye and ear protection. It's the last line of defence, after removing or controlling the hazard.","ppe-person","*"],
    ["RPE",["respiratory protective equipment","mask","dust mask","ffp3"],"Masks and respirators that protect your lungs from dust and fumes. It must be the right type (such as FFP3 for silica dust) and face-fit tested.","ppe-close","*"],
    ["Risk assessment",["risk assessments"],"Working out what could harm people on a job, who could be harmed, how likely and how bad, and the controls to reduce the risk. Read it and sign it before you start.","signs","*"],
    ["Method statement",["safe system of work"],"A step-by-step description of how a job will be done safely, based on the risk assessment.","signs","*"],
    ["RAMS",["risk assessment and method statement"],"Risk Assessment and Method Statement together: what could go wrong and how the job will be done safely.","signs","*"],
    ["COSHH",["hazardous substances"],"Control of Substances Hazardous to Health: the rules for working safely with things like cement, lime, silica dust, adhesives and solvents. Read the COSHH sheet before using a product.","sign-warn","*"],
    ["CSCS card",["cscs"],"The card that shows you've got the training and qualifications for your job on a construction site.","ppe-person","*"],
    ["Toolbox talk",["toolbox talks"],"A short safety briefing on site about one topic, such as dust or working at height. It counts towards your learning hours.","team","*"],
    ["Permit to work",["permit"],"Written permission for a high-risk job, such as hot works or confined spaces, with the controls that must be in place.","signs","*"],
    ["Working at height",["height","ladders"],"Any work where you could fall and hurt yourself. Avoid it if you can, use proper platforms (scaffolds, towers, podiums) if you can't, and only use ladders for short, light jobs.","ppe-person","*"],
    ["Scaffold tag",["scafftag","scaffold inspection"],"The tag on a scaffold showing it's been inspected and is safe to use. Green means safe; no tag or red means don't go on it.","signs","*"],
    ["Manual handling",["lifting"],"Lifting, carrying and moving things by hand. Plan the lift, keep the load close, bend your knees, and get help or a machine for heavy or awkward loads.","ppe-person","*"],
    ["HAVS",["hand arm vibration","vibration white finger"],"Hand-arm vibration syndrome: damage to hands and fingers from long use of vibrating tools. Limit your time on the tool and report tingling or numbness.","ppe-close","*"],
    ["Silica dust",["rcs","respirable crystalline silica","dust"],"Fine dust from cutting bricks, blocks, concrete and stone. It causes serious lung disease. Use water suppression or extraction and the right mask.","ppe-close","*"],
    ["Asbestos",[],"A dangerous fibre in older buildings. If you think you've found it, stop, keep people away and tell your supervisor. Never break it up.","sign-warn","*"],
    ["PUWER",["provision and use of work equipment"],"The regulations that say work equipment must be suitable, maintained, inspected, and only used by trained people.","tools","*"],
    ["LOLER",["lifting operations"],"The regulations for lifting equipment and lifting operations: planned, supervised and with inspected equipment.","signs","*"],
    ["RIDDOR",[],"The regulations for reporting serious injuries, diseases and dangerous occurrences at work to the HSE.","sign-firstaid","*"],
    ["CDM",["cdm regulations"],"The Construction (Design and Management) Regulations: how health and safety is planned and managed on building projects.","signs","*"],
    ["HSE",["health and safety executive"],"The Health and Safety Executive: the government body that sets and enforces health and safety at work.","signs","*"],
    ["Near miss",["near misses"],"Something that could have hurt someone but didn't. Report it, so it can be put right before it happens again.","sign-warn","*"],
    ["Fire extinguishers",["extinguisher","fire extinguisher"],"All red, with a coloured band: water (red) for wood and paper, foam (cream), CO2 (black) for electrical fires, powder (blue) for most fires. Never use water on electrics.","extinguishers","*"],
    ["Safety signs",["signs","signage","safety signage"],"Blue circles are must-do (mandatory), red circles with a bar are don't (prohibition), yellow triangles are warnings, green are safe conditions like first aid and exits.","signs","*"],
    ["First aid",["first aider","first aid box"],"Know who the first aider is and where the first aid kit is on your site. Report every injury, however small.","sign-firstaid","*"],
    ["Hard hat",["helmet","safety helmet"],"Protects your head from falling objects and knocks. Check it for cracks and replace it after an impact or by its expiry date.","sign-hat","*"],
    ["Hi-vis",["high visibility","hi viz","vest"],"High-visibility clothing so plant drivers and others can see you. Keep it clean and fastened.","ppe-person","*"],
    ["Safety boots",["boots","steel toe caps"],"Boots with protective toe caps and midsoles to protect your feet from falling objects and nails.","ppe-close","*"],
    ["Ear defenders",["ear protection","hearing protection","ear plugs"],"Protect your hearing from loud tools and machines. Wear them whenever you have to raise your voice to be heard.","ppe-close","*"],
    ["Safety glasses",["goggles","eye protection"],"Protect your eyes from dust, chips and splashes, especially when cutting, grinding or mixing.","sign-eyes","*"],
    ["Housekeeping",["good housekeeping","tidy site"],"Keeping the work area tidy: clear walkways, waste in skips, materials stacked safely. Most slips and trips come from poor housekeeping.","area","*"],
    ["Waste",["recycling","skips"],"Separate waste into the right skips so it can be recycled, and never burn or bury it on site.","area","*"],
    ["Drawings",["plans","elevations","sections"],"Scaled drawings of the building: plans look down from above, elevations show the faces, sections cut through it. Read the scale and dimensions, never measure off the drawing.","write","*"],
    ["Specification",["spec"],"The written document that says which materials, standards and workmanship must be used.","write","*"]
  ];
  const glossary=()=>G.filter(g=>g[4]==="*"||(g[4]==="t")===timber()||(trade()==="trowel3"&&g[4]==="b"));
  const norm=s=>String(s||"").toLowerCase().replace(/[’']/g,"").replace(/[^a-z0-9.\s-]/g," ").replace(/\s+/g," ").trim();
  const stem=w=>w.replace(/(ies)$/,"y").replace(/(ing|es|s)$/,"");
  /* "What's a bolster for?" -> "bolster". */
  const subject=t=>norm(t).replace(/^(so |ok |okay |hey |evia |please )+/,"").replace(/\b(what|whats|what is|what are|whats a|what does|what do|define|explain|tell me about|tell me what|meaning of|how does|how do|do you know|can you tell me|i dont know|whos|who is|a|an|the|mean|means|used|use|for|is|are|it|do|does|thing|called)\b/g," ").replace(/\?/g," ").replace(/\s+/g," ").trim();
  function findTerm(t){
    const q=subject(t),qs=q.split(" ").filter(Boolean).map(stem);
    if(!qs.length)return null;
    let best=null,score=0;
    for(const g of G){
      const names=[g[0]].concat(g[1]).map(norm);
      for(const n of names){
        const ns=n.split(" ").map(stem);let s=0;
        if(n===q)s=100;
        else if(q.includes(n)&&n.length>=3)s=60+n.length;
        else{const hit=ns.filter(w=>qs.includes(w)).length;if(hit===ns.length)s=40+hit*5;else if(hit)s=hit*12}
        if(g[4]!=="*"&&(g[4]==="t")!==timber())s-=8;
        if(s>score){score=s;best=g}
      }
    }
    return score>=40?best:null;
  }

  /* ---------- Teach me: find the lesson that covers a question ---------- */
  function lessons(){
    const E=window.EVIA_TEACH||{},out=[];
    ((E.courses||{})[trade()]||[]).forEach(u=>(u.lessons||[]).forEach(l=>out.push({l,unit:u.unit})));
    (E.fs||[]).forEach(u=>(u.lessons||[]).forEach(l=>out.push({l,unit:u.unit||u.title||u.fs})));
    return out;
  }
  const STOP=new Set("what whats how does do the and for with that this your you are was were can could would should when where which why who have has had into from about there their them they then than just like also make made need needs use used using get got very much many more most some any all one two three four five much its it's is be been being on in at to of a an or as by if so no not yes my me i we our us".split(" "));
  function findLesson(t){
    const words=[...new Set(norm(t).split(" ").filter(w=>w.length>2&&!STOP.has(w)).map(stem))];
    if(!words.length)return null;
    let best=null,score=0;
    for(const {l,unit} of lessons()){
      const steps=(l.steps||[]).map(s=>[s.title,s.say,s.q,s.why,s.text].filter(Boolean).join(" ")),all=norm([l.title,l.blurb].concat(steps).join(" "));
      const s=words.filter(w=>all.includes(w)).length*10+words.filter(w=>norm(l.title+" "+(l.blurb||"")).includes(w)).length*8;
      if(s>score){
        score=s;
        const hit=(l.steps||[]).map(st=>String(st.say||st.why||"")).filter(Boolean).map(x=>({x,n:words.filter(w=>norm(x).includes(w)).length})).sort((a,b)=>b.n-a.n)[0];
        best={l,unit,snippet:hit&&hit.n?hit.x.replace(/<[^>]+>/g,""):l.blurb||""};
      }
    }
    return score>=Math.min(20,words.length*10)?best:null;
  }

  /* ---------- Numbers from what the learner typed ---------- */
  const NUM="(\\d+(?:\\.\\d+)?)";
  function lengths(t){
    /* Every number with its unit, in metres (a bare number over 50 is taken as millimetres). */
    const out=[],re=new RegExp(NUM+"\\s*(mm|millimet(?:re|er)s?|cm|centimet(?:re|er)s?|m(?![a-z²2])|met(?:re|er)s?|ft|foot|feet|in(?:ch|ches)?\\b|\")?","gi");
    let m;while((m=re.exec(t))){const v=parseFloat(m[1]),u=(m[2]||"").toLowerCase();
      out.push(/^mm|^millim/.test(u)?v/1000:/^cm|^centim/.test(u)?v/100:/^m|^met/.test(u)?v:/^ft|^foot|^feet/.test(u)?v*0.3048:/^in|"/.test(u)?v*0.0254:v>50?v/1000:v)}
    return out;
  }
  const areaOf=t=>{const m=new RegExp(NUM+"\\s*(m2|m²|sq\\s?m|square met(?:re|er)s?|sqm)","i").exec(t);return m?parseFloat(m[1]):null};
  const countOf=(t,word)=>{const m=new RegExp(NUM+"\\s*"+word,"i").exec(t);return m?parseFloat(m[1]):null};
  const ratioOf=t=>{const m=/\b1\s*[:to]+\s*(\d+(?:\.\d+)?)(?:\s*[:to]+\s*(\d+(?:\.\d+)?))?/i.exec(t);return m?{a:parseFloat(m[1]),b:m[2]?parseFloat(m[2]):null}:null};

  /* ---------- The calculators ----------
     Each returns {title, big, sub, rows:[[label,value]], working:[lines], note}. The rules of thumb are stated in
     the working, so the learner can see and check them. */
  const up=(n,step)=>Math.ceil(n/(step||1)-1e-9)*(step||1);
  const RATE={half:{b:60,label:"Half-brick wall (stretcher bond)",mortar:0.022},one:{b:120,label:"One-brick wall (225 mm)",mortar:0.052},block:{k:10,label:"Blockwork (440 × 215 blocks)",mortar:0.01},cavity:{b:60,k:10,label:"Cavity wall (brick outer leaf, block inner leaf)",mortar:0.032}};
  const calc={
    bricks({length,height,area,type,waste}){
      const r=RATE[type]||RATE.half,a=area||(length||0)*(height||0),w=waste==null?5:waste,f=1+w/100;
      if(!(a>0))return null;
      const b=r.b?up(a*r.b*f):0,k=r.k?up(a*r.k*f):0;
      const working=[(area?"Area: "+nf(a)+" m²":"Area: "+nf(length)+" m × "+nf(height)+" m = "+nf(a)+" m²")];
      if(r.b)working.push("Bricks: "+nf(a)+" m² × "+r.b+" per m² = "+nf(a*r.b,0)+", plus "+w+"% for cuts and breakages = "+nf(b,0));
      if(r.k)working.push("Blocks: "+nf(a)+" m² × "+r.k+" per m² = "+nf(a*r.k,0)+", plus "+w+"% = "+nf(k,0));
      return {kind:"bricks",title:r.label,big:[b?nf(b,0)+" bricks":"",k?nf(k,0)+" blocks":""].filter(Boolean).join(" + "),sub:nf(a)+" m² of wall",
        rows:[["Wall area",nf(a)+" m²"],["Per m²",[r.b?r.b+" bricks":"",r.k?r.k+" blocks":""].filter(Boolean).join(" + ")],["Allowance",w+"%"]],
        working,note:"Openings aren’t counted: take their area off first. Rates are for standard 215 × 102.5 × 65 mm bricks with 10 mm joints.",area:a,type:type||"half"};
    },
    mortar({bricks,area,type,ratio}){
      const r=RATE[type]||RATE.half,a=area||(bricks?bricks/(r.b||60):0),n=ratio||4;
      if(!(a>0))return null;
      const wet=a*r.mortar*1.1,dry=wet*1.3,cement=dry/(1+n),sand=dry*n/(1+n);
      const bags=up(cement*1440/25),tonnes=sand*1600/1000;
      return {kind:"mortar",title:"Mortar at 1:"+nf(n),big:bags+" bags of cement + "+nf(tonnes,1)+" t of sand",sub:"about "+nf(wet,2)+" m³ of mortar",
        rows:[["For",bricks?nf(bricks,0)+" bricks":nf(a)+" m² of "+r.label.toLowerCase()],["Mortar",nf(wet,2)+" m³"],["Cement (25 kg bags)",String(bags)],["Building sand",nf(tonnes,1)+" tonnes"]],
        working:[(bricks?nf(bricks,0)+" bricks ÷ "+(r.b||60)+" per m² = "+nf(a)+" m²":"Wall area: "+nf(a)+" m²"),"Mortar: "+nf(a)+" m² × "+r.mortar+" m³ per m², plus 10% = "+nf(wet,3)+" m³",
          "Dry materials take up more room than the wet mix: × 1.3 = "+nf(dry,3)+" m³","1:"+nf(n)+" is "+nf(1+n)+" parts: cement "+nf(cement,3)+" m³, sand "+nf(sand,3)+" m³",
          "Cement at 1,440 kg per m³ = "+nf(cement*1440,0)+" kg = "+bags+" × 25 kg bags","Sand at about 1,600 kg per m³ = "+nf(tonnes,2)+" tonnes"],
        note:"A rule of thumb for ordering, not a specification: always use the mix on the drawings, and check with your supervisor.",area:a,type:type||"half",ratio:n};
    },
    concrete({length,width,depth,mix}){
      const v=(length||0)*(width||0)*(depth||0);if(!(v>0))return null;
      const m=mix||{a:2,b:4},parts=1+m.a+m.b,dry=v*1.54;
      const bags=up(dry/parts*1440/25),sand=dry*m.a/parts*1.6,agg=dry*m.b/parts*1.5;
      return {kind:"concrete",title:"Concrete",big:nf(v,2)+" m³",sub:"order about "+nf(up(v*1.1,0.25),2)+" m³ of ready-mix",
        rows:[["Size",nf(length)+" × "+nf(width)+" × "+nf(depth)+" m"],["Volume",nf(v,3)+" m³"],["To mix yourself (1:"+m.a+":"+m.b+")",bags+" bags of cement, "+nf(sand,1)+" t sharp sand, "+nf(agg,1)+" t gravel"]],
        working:["Volume: "+nf(length)+" × "+nf(width)+" × "+nf(depth)+" = "+nf(v,3)+" m³","Ready-mix: add about 10% for waste and uneven ground = "+nf(v*1.1,2)+" m³",
          "Mixing by hand: dry materials × 1.54 = "+nf(dry,3)+" m³, split 1:"+m.a+":"+m.b+" ("+parts+" parts)","Cement "+nf(dry/parts,3)+" m³ × 1,440 kg = "+bags+" × 25 kg bags; sand × 1.6 t/m³; gravel × 1.5 t/m³"],
        note:"Check the depth and mix on the drawings. Depths are easy to get wrong: 100 mm is 0.1 m."};
    },
    area({length,width,depth}){
      if(!(length>0&&width>0))return null;
      const a=length*width,v=depth?a*depth:null;
      return {kind:"area",title:v?"Volume":"Area",big:v?nf(v,3)+" m³":nf(a,2)+" m²",sub:v?"area "+nf(a,2)+" m² × "+nf(depth)+" m":nf(length)+" m × "+nf(width)+" m",
        rows:[["Length",nf(length)+" m"],["Width",nf(width)+" m"]].concat(v?[["Depth",nf(depth)+" m"]]:[]),
        working:["Area = length × width = "+nf(length)+" × "+nf(width)+" = "+nf(a,3)+" m²"].concat(v?["Volume = area × depth = "+nf(a,3)+" × "+nf(depth)+" = "+nf(v,3)+" m³"]:[]),
        note:"Everything in metres first: 2400 mm is 2.4 m."};
    },
    square({a,b}){
      if(!(a>0))return null;
      if(!(b>0)){const k=a/4;return {kind:"square",title:"Square corner (3-4-5)",big:nf(k*3,3)+" / "+nf(k*4,3)+" / "+nf(k*5,3)+" m",sub:"sides and diagonal for a square corner",
        rows:[["Short side (3)",nf(k*3,3)+" m"],["Long side (4)",nf(k*4,3)+" m"],["Diagonal (5)",nf(k*5,3)+" m"]],working:["Scale 3-4-5 so the long side is "+nf(a)+" m: × "+nf(k,3),"3 × "+nf(k,3)+" = "+nf(k*3,3)+", 4 × "+nf(k,3)+" = "+nf(k*4,3)+", 5 × "+nf(k,3)+" = "+nf(k*5,3)],
        note:"Measure along both sides from the corner. When the diagonal is exactly right, the corner is 90°."}}
      const d=Math.sqrt(a*a+b*b);
      return {kind:"square",title:"Diagonal for a square corner",big:nf(d*1000,0)+" mm",sub:nf(a)+" m × "+nf(b)+" m",
        rows:[["Side A",nf(a)+" m"],["Side B",nf(b)+" m"],["Diagonal",nf(d,3)+" m"]],working:["Pythagoras: diagonal² = A² + B²","= "+nf(a*a,4)+" + "+nf(b*b,4)+" = "+nf(a*a+b*b,4),"Diagonal = √"+nf(a*a+b*b,4)+" = "+nf(d,4)+" m"],
        note:"If the diagonal measures longer, the corner is over 90°; shorter, under 90°. Checking both diagonals of a rectangle is quicker: they should match."};
    },
    stairs({rise}){
      const R=rise>20?rise:rise*1000;if(!(R>300&&R<8000))return null;
      let n=Math.ceil(R/220),r,g,p;
      for(;;n++){r=R/n;g=Math.max(220,Math.min(300,600-2*r));p=Math.atan(r/g)*180/Math.PI;if(p<=42&&2*r+g>=550&&2*r+g<=700)break;if(n>60)break}
      return {kind:"stairs",title:"Private stair",big:n+" risers of "+nf(r,1)+" mm",sub:(n-1)+" treads with a "+nf(g,0)+" mm going",
        rows:[["Total rise",nf(R,0)+" mm"],["Risers",n+" × "+nf(r,1)+" mm"],["Going",nf(g,0)+" mm"],["2R + G",nf(2*r+g,0)+" mm"],["Pitch",nf(p,1)+"°"],["Total going",nf(g*(n-1),0)+" mm"]],
        working:["Rise can’t be over 220 mm: "+nf(R,0)+" ÷ 220 = "+nf(R/220,2)+", so at least "+Math.ceil(R/220)+" risers",n+" risers: "+nf(R,0)+" ÷ "+n+" = "+nf(r,1)+" mm each",
          "Going for a comfortable step: 2R + G ≈ 600, so G = 600 − 2 × "+nf(r,1)+" = "+nf(600-2*r,0)+" mm"+(g!==600-2*r?", kept between 220 and 300 = "+nf(g,0)+" mm":""),
          "Check: 2R + G = "+nf(2*r+g,0)+" (must be 550 to 700), pitch "+nf(p,1)+"° (no more than 42°)"],
        note:"Approved Document K rules for a private stair. The drawings and building control have the final say.",rise:R};
    },
    fall({length,ratio,drop}){
      if(length>0&&ratio>0){const d=length/ratio;return {kind:"fall",title:"Fall at 1 in "+nf(ratio),big:nf(d*1000,0)+" mm",sub:"over "+nf(length)+" m",
        rows:[["Length",nf(length)+" m"],["Gradient","1 in "+nf(ratio)+" ("+nf(100/ratio,2)+"%)"],["Drop",nf(d*1000,0)+" mm"]],working:["Drop = length ÷ "+nf(ratio)+" = "+nf(length)+" ÷ "+nf(ratio)+" = "+nf(d,4)+" m = "+nf(d*1000,0)+" mm"],
        note:"Measure from a level line, not the ground."}}
      if(length>0&&drop>0){const x=length/drop;return {kind:"fall",title:"Gradient",big:"1 in "+nf(x,1),sub:nf(drop*1000,0)+" mm over "+nf(length)+" m",
        rows:[["Length",nf(length)+" m"],["Drop",nf(drop*1000,0)+" mm"],["Gradient","1 in "+nf(x,1)+" ("+nf(100/x,2)+"%)"]],working:["1 in X: X = length ÷ drop = "+nf(length)+" ÷ "+nf(drop,3)+" = "+nf(x,1)],note:""}}
      return null;
    },
    convert(v,to){
      const from=v;const mm=from*1000;
      return {kind:"convert",title:"Conversion",big:to==="mm"?nf(mm,1)+" mm":to==="cm"?nf(from*100,2)+" cm":nf(from,4)+" m",sub:"",rows:[["Metres",nf(from,4)+" m"],["Centimetres",nf(from*100,2)+" cm"],["Millimetres",nf(mm,1)+" mm"],["Feet and inches",Math.floor(from/0.3048)+" ft "+nf((from/0.0254)%12,1)+" in"]],
        working:["1 m = 100 cm = 1,000 mm","1 ft = 304.8 mm, 1 in = 25.4 mm"],note:""};
    },
    sum(expr){
      const e=expr.replace(/×|x/gi,"*").replace(/÷/g,"/").replace(/\^/g,"**").replace(/[^0-9.+\-*/() ]/g,"");
      if(!/\d/.test(e)||!/[+\-*/]/.test(e))return null;
      let v;try{v=Function('"use strict";return ('+e+")")()}catch(_){return null}
      if(!isFinite(v))return null;
      return {kind:"sum",title:"Sum",big:nf(v,4),sub:expr.trim(),rows:[],working:[expr.trim()+" = "+nf(v,6)],note:""};
    }
  };

  /* ---------- Interactive calculator cards ---------- */
  const FORMS={
    bricks:{title:"Bricks and blocks",fields:[["length","Wall length","m",4],["height","Wall height","m",1.2],["waste","Allowance","%",5]],select:["type",[["half","Half-brick wall"],["one","One-brick wall"],["block","Blockwork"],["cavity","Cavity wall (brick and block)"]]]},
    mortar:{title:"Mortar",fields:[["area","Wall area","m²",5],["ratio","Sand parts (1:X)","",4]],select:["type",[["half","Half-brick wall"],["one","One-brick wall"],["block","Blockwork"],["cavity","Cavity wall"]]]},
    concrete:{title:"Concrete",fields:[["length","Length","m",3],["width","Width","m",2],["depth","Depth","m",0.1]]},
    area:{title:"Area and volume",fields:[["length","Length","m",4],["width","Width","m",3],["depth","Depth (for volume)","m",""]]},
    square:{title:"Square corner (3-4-5)",fields:[["a","Side A","m",3],["b","Side B","m",4]]},
    stairs:{title:"Stairs",fields:[["rise","Floor to floor rise","mm",2600]]},
    fall:{title:"Falls and gradients",fields:[["length","Length","m",6],["ratio","1 in","",40]]}
  };
  const CALC_LIST=[["bricks","Bricks and blocks","How many for a wall"],["mortar","Mortar","Cement and sand for a wall"],["concrete","Concrete","Slabs, bases and footings"],["stairs","Stairs","Risers, goings and pitch"],["square","Square corner","3-4-5 and diagonals"],["fall","Falls","Drainage and paving gradients"],["area","Area and volume","m² and m³"]];
  function cardHtml(r){
    if(!r)return '<p class="br-none">Put in the sizes to see the answer.</p>';
    return '<div class="br-result"><span class="br-kicker">'+esc(r.title)+'</span><b class="br-big">'+esc(r.big)+'</b>'+(r.sub?'<span class="br-sub">'+esc(r.sub)+'</span>':"")+'</div>'+
      (r.rows.length?'<dl class="br-rows">'+r.rows.map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd></div>').join("")+'</dl>':"")+
      (r.working.length?'<details class="br-work"><summary>Show the working</summary><ol>'+r.working.map(w=>'<li>'+esc(w)+'</li>').join("")+'</ol></details>':"")+
      (r.note?'<p class="br-note">'+esc(r.note)+'</p>':"");
  }
  function runForm(kind,p){
    const n=k=>{const v=parseFloat(p[k]);return isFinite(v)?v:undefined};
    if(kind==="bricks")return calc.bricks({length:n("length"),height:n("height"),type:p.type,waste:n("waste")});
    if(kind==="mortar")return calc.mortar({area:n("area"),type:p.type,ratio:n("ratio")});
    if(kind==="concrete")return calc.concrete({length:n("length"),width:n("width"),depth:n("depth")});
    if(kind==="area")return calc.area({length:n("length"),width:n("width"),depth:n("depth")});
    if(kind==="square")return calc.square({a:n("a"),b:n("b")});
    if(kind==="stairs")return calc.stairs({rise:n("rise")});
    if(kind==="fall")return calc.fall({length:n("length"),ratio:n("ratio")});
    return null;
  }
  /* A calculator in the chat: its inputs (filled from what was asked), and the answer, which updates as you type. */
  function calcWidget(kind,params){
    const F=FORMS[kind];if(!F)return;
    const p=Object.assign({},...F.fields.map(([k,,,d])=>({[k]:d})),F.select?{[F.select[0]]:F.select[1][0][0]}:{},params||{});
    mem.last={kind,params:p};
    const html='<div class="br-card br-calc" data-kind="'+kind+'"><div class="br-head"><span class="br-ic">'+ICON.calc+'</span><strong>'+esc(F.title)+'</strong></div>'+
      '<div class="br-fields">'+F.fields.map(([k,label,unit])=>'<label><span>'+esc(label)+'</span><span class="br-in"><input type="number" inputmode="decimal" step="any" data-k="'+k+'" value="'+esc(p[k]==null?"":p[k])+'">'+(unit?'<em>'+esc(unit)+'</em>':"")+'</span></label>').join("")+
      (F.select?'<label class="br-wide"><span>Type</span><select data-k="'+F.select[0]+'">'+F.select[1].map(([v,t])=>'<option value="'+v+'"'+(p[F.select[0]]===v?" selected":"")+'>'+esc(t)+'</option>').join("")+'</select></label>':"")+'</div>'+
      '<div class="br-out">'+cardHtml(runForm(kind,p))+'</div></div>';
    K().widget(html,box=>{
      const card=box.querySelector(".br-calc"),out=card.querySelector(".br-out");
      card.querySelectorAll("[data-k]").forEach(inp=>inp.addEventListener("input",()=>{p[inp.dataset.k]=inp.value;mem.last={kind,params:p};const open=!!out.querySelector("details[open]");out.innerHTML=cardHtml(runForm(kind,p));if(open){const d=out.querySelector("details");if(d)d.open=true}}));
    });
  }
  function calculators(){
    K().widget('<div class="br-card br-list"><div class="br-head"><span class="br-ic">'+ICON.calc+'</span><strong>Site calculators</strong></div>'+
      CALC_LIST.filter(([k])=>timber()?!["bricks","mortar"].includes(k):true).map(([k,t,s])=>'<button type="button" class="br-row" data-open="'+k+'"><span><b>'+esc(t)+'</b><small>'+esc(s)+'</small></span>'+ICON.go+'</button>').join("")+'</div>',
      box=>box.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>{K().userSays(b.querySelector("b").textContent);open(b.dataset.open)}));
  }
  function open(kind){
    const lines={bricks:"Here you go. Put in the wall size and I’ll count them, with 5% extra for cuts.",mortar:"Put in the wall area and the mix, and I’ll work out the cement and sand.",concrete:"Length, width and depth in metres, and I’ll give you the volume and what to order.",
      area:"Length and width for the area; add a depth for the volume.",square:"Give me two sides and I’ll give you the diagonal for a square corner.",stairs:"Put in the floor-to-floor height and I’ll work out the risers and goings.",fall:"Length and the gradient (1 in X), and I’ll give you the drop."};
    K().say(lines[kind]||"Here you go.");calcWidget(kind);follow(kind);
  }

  /* ---------- KSBs in plain words, with where the learner is ---------- */
  function ksb(code){
    const d=typeof data==="function"?data():null;if(!d)return false;
    const C=code.toUpperCase().replace(/\s+/g,""),units=[];let text="";
    d.u.forEach((u,i)=>u[1].forEach(k=>{const [c,...t]=String(k).split("|");if(c.trim().toUpperCase()===C){text=text||t.join("|").trim();units.push({name:u[0],index:i})}}));
    if(text&&typeof officialKsb==="function"&&officialKsb(C))text=officialKsb(C);
    if(!text){K().say("I can’t find <strong>"+esc(C)+"</strong> on the "+esc(d.name)+" standard. KSB codes look like K1, S14 or B2.");return true}
    const so=typeof ksbSignoff==="function"?ksbSignoff():{signed:new Set(),on:false};
    const inEvidence=(typeof evidence!=="undefined"?evidence:[]).some(e=>e&&e.c===course&&(e.k||[]).map(x=>String(x).split("|")[0].trim().toUpperCase()).includes(C))||(typeof inductionKsbs==="function"&&inductionKsbs().includes(C));
    /* Connected to a college, the assessor signs KSBs off; on their own, Evia marks off what's in their evidence. */
    const signed=so.on?!!(so.signed&&so.signed.has(C)):inEvidence;
    const kind={K:"Knowledge",S:"Skill",B:"Behaviour"}[C[0]]||"KSB";
    const status=signed?'<span class="br-pill good">'+ICON.tick+(so.on?'Signed off':'Evidenced')+'</span>':inEvidence?'<span class="br-pill mid">In your evidence'+(so.on?", waiting for your assessor":"")+'</span>':'<span class="br-pill low">No evidence yet</span>';
    K().say(pick(["Here’s "+esc(C)+" in plain words.",esc(C)+" is a "+kind.toLowerCase()+" on your course."]));
    K().widget('<div class="br-card"><div class="br-head"><span class="br-ic">'+ICON.ksb+'</span><strong>'+esc(C)+' · '+kind+'</strong>'+status+'</div><p class="br-def">'+esc(text)+'</p>'+
      '<p class="br-small">In '+units.map(u=>'<b>'+esc(u.name)+'</b>').join(", ")+'.</p></div>');
    const u=units[0];
    K().replies([signed?null:{label:"Open "+u.name,primary:true,run:()=>K().openUnitFromChat(u)},{label:"Which KSBs am I missing?",run:()=>answer("which ksbs am i missing")},{label:"Something else",run:()=>suggestions()}].filter(Boolean));
    return true;
  }
  function missing(){
    const a=K().analyse(),so=typeof ksbSignoff==="function"?ksbSignoff():null;
    const gaps=a.units.map(u=>({u,n:u.missing.length})).filter(x=>x.n).sort((x,y)=>y.n-x.n);
    const more=window.eviaMoreRequired?window.eviaMoreRequired():[];
    if(more.length){
      K().say("Your assessor has asked for a bit more on <strong>"+esc([...new Set(more.map(x=>x.unit))].slice(0,2).join("</strong> and <strong>"))+"</strong>: "+esc(more.slice(0,6).map(x=>x.code).join(", "))+". Catch up on the unit page takes you straight through them.");
    }
    if(!gaps.length){K().say("Every KSB on your course has evidence. Next, make the weakest units stronger with more photos and fuller write-ups.");}
    else K().say("You’ve still got <strong>"+a.units.reduce((n,u)=>n+u.missing.length,0)+"</strong> KSBs without evidence"+(so&&so.on?" or sign-off":"")+". The quickest wins are the units that cover the most of them:");
    if(gaps.length)K().widget('<div class="br-card br-list">'+gaps.slice(0,4).map(({u,n})=>'<button type="button" class="br-row" data-u="'+u.index+'"><span><b>'+esc(u.name)+'</b><small>'+n+' to go: '+esc(u.missing.slice(0,5).join(", "))+(u.missing.length>5?"…":"")+'</small></span>'+ICON.go+'</button>').join("")+'</div>',
      box=>box.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>K().openUnitFromChat({index:+b.dataset.u})));
    K().replies([{label:"What should I do today?",primary:true,run:()=>{todayCard()}},{label:"Something else",run:()=>suggestions()}]);
  }

  /* ---------- Today: up to three things, most urgent first ---------- */
  const KIND_IC={course:ICON.book,learning:ICON.sun,test:ICON.ksb,targets:ICON.ksb,review:ICON.ksb,prep:ICON.ksb,feedback:ICON.tick,stats:ICON.tick,confidence:ICON.ksb,backup:ICON.go,leaderboard:ICON.tick};
  function todayCard(opts){
    const S=window.eviaStats;let s=null,list=[];
    try{s=S.compute();list=S.nudges(s)}catch(_){}
    const a=s&&s.a,items=list.slice(0,3);
    /* For learners connected to their college whose phone can have notifications, until they’ve answered once. */
    const askPush=!!(window.eviaPush&&window.eviaPush.state()==="off"&&!window.eviaPush.asked());
    const stats=s?[a&&a.timePct!=null?a.timePct+"% through":"",a?a.ksbPct+"% of KSBs with evidence":"",(s.otjWeek?window.eviaHM(s.otjWeek):"0h")+" of learning this week"].filter(Boolean):[];
    const html='<div class="br-card br-today"><div class="br-head"><span class="br-ic">'+ICON.sun+'</span><strong>Today</strong><span class="br-date">'+esc(new Date().toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"short"}))+'</span></div>'+
      (stats.length?'<p class="br-stats">'+stats.map(esc).join(" · ")+'</p>':"")+
      (items.length?items.map((n,i)=>'<button type="button" class="br-todo'+(i===0?" first":"")+'" data-n="'+i+'"><span class="br-todo-ic">'+(KIND_IC[n.action.kind]||ICON.go)+'</span><span class="br-todo-t"><span>'+n.text+'</span><b>'+esc(n.action.label)+'</b></span>'+ICON.go+'</button>').join("")
        :'<div class="br-todo done"><span class="br-todo-ic">'+ICON.tick+'</span><span class="br-todo-t"><span>You’re on track. Nothing urgent today.</span><b>Make your weakest unit stronger</b></span></div>')+
      (askPush?'<button type="button" class="br-todo br-push" id="br-push"><span class="br-todo-ic">'+ICON.bell+'</span><span class="br-todo-t"><span>Get a notification when your assessor signs something off or a review is due.</span><b>Turn on notifications</b></span>'+ICON.go+'</button>':"")+'</div>';
    K().widget(html,box=>{
      box.querySelectorAll("[data-n]").forEach(b=>b.onclick=()=>{const n=items[+b.dataset.n];if(n.achievements&&S.markSeen)S.markSeen(n.achievements);K().userSays(n.action.label);K().runNudge(n)});
      const pb=box.querySelector("#br-push");
      if(pb)pb.onclick=async()=>{
        pb.disabled=true;K().userSays("Turn on notifications");
        let ok=false;try{ok=await window.eviaPush.on()}catch(_){}
        pb.remove();
        K().say(ok?"Done. I’ll only tell you about your course: sign-offs, targets, reviews and learning hours, and never between 9pm and 7:30am. You can turn them off in your profile."
          :window.eviaPush.state()==="blocked"?"Notifications are blocked for Evia in your phone’s settings. Allow them there, then turn them on in your profile."
          :"I couldn’t turn them on just now. You can try again from your profile.");
      };
    });
    if(opts&&opts.quiet)return;
  }

  /* ---------- How to do things in the app ---------- */
  const flows=()=>window.eviaCoachFlows||{};
  const nudge=(kind,label,extra)=>()=>K().runNudge(Object.assign({action:{kind,label}},extra||{}));
  const goNav=(where,after)=>()=>{K().closeChat();setTimeout(()=>{nav(where);if(after)setTimeout(after,400)},60)};
  const HOWTO=[
    [/\bcheck(ing)?[ -]?in\b|\bsign[ -]?in\b.*\b(class|register|college)\b|\bregister\b/,"Scan the code on the classroom screen and you’re on your tutor’s register.","Check in to class",()=>{K().closeChat();setTimeout(()=>window.eviaCheckIn&&window.eviaCheckIn.open(),120)}],
    [/\b(log|add|record)\b.*\b(hours?|learning|otj|training)\b|\b(off.?the.?job|otj|glh)\b/,"Learning hours are anything that teaches you the job: training days, toolbox talks, research and Teach me. Let’s log some.","Log learning hours",()=>flows().hours&&flows().hours()],
    [/\b(check|how good|rate|mark)\b.*\bevidence\b|\bevidence check\b/,"I’ll look at a piece of your evidence and tell you what would make it stronger.","Check my evidence",()=>flows().evidence&&flows().evidence()],
    [/\b(ready|prepare|prep)\b.*\breview\b|\breview\b.*\b(due|when|next)\b/,"Let’s get you ready for your progress review: I’ll go through each area and what your assessor will want to see.","Get ready for my review",nudge("prep","Get ready for my review")],
    [/\btargets?\b/,"Here are your targets and how close you are to each.","Show my targets",nudge("targets","My targets")],
    [/\b(epa|end.?point|mock|professional discussion)\b/,"EPA practice lives in Teach me now: quick practice, full mocks and the professional discussion.","Open EPA practice",()=>{K().closeChat();setTimeout(()=>window.eviaOpenEpa&&window.eviaOpenEpa(),120)}],
    [/\bmaths?\b.*\b(test|practi[cs]e|quiz)\b|\b(test|practi[cs]e)\b.*\bmaths?\b/,"A quick maths test keeps it fresh: 5 questions.","Take a maths test",nudge("test","Take a maths test",{id:"maths"})],
    [/\benglish\b.*\b(test|practi[cs]e|quiz)\b|\b(test|practi[cs]e)\b.*\benglish\b/,"A quick English practice: 5 questions.","Take an English test",nudge("test","Take an English test",{id:"english"})],
    [/\bconfiden/,"Rate how confident you feel with each practical skill, so you and your tutor know what to practise.","Do a confidence check",nudge("confidence","Confidence check")],
    [/\b(download|share|send|aptem|zip|pdf|e.?portfolio)\b/,"Open a unit, then tap Send to Portfolio at the bottom: you can save everything as a zip, share it all, or just the PDF.","Go to My course",goNav("course")],
    [/\bback.?up\b/,"A backup saves your whole portfolio to a file, in case your phone breaks or goes missing.","Back up now",nudge("backup","Back up now")],
    [/\b(colou?r|shape|theme|look|hat|accessor|expression|face)\b/,"You can change how I look (colour, shape, hats and faces) in your profile and in Rewards.","Open Rewards",goNav("rewards")],
    [/\b(coins?|rewards?|shop|spend)\b/,"You earn coins for lessons, evidence and games, and spend them in Rewards.","Open Rewards",goNav("rewards")],
    [/\b(games?|leaderboards?|trade|crossword|flappy|showdown)\b/,"The mini games and leaderboards are in Teach me.","Open Teach me",goNav("teach")],
    [/\b(strong|good|better)\b.*\b(portfolio|evidence)\b|\bhow.*\b(get|build|make)\b.*\bevidence\b/,"I’ll show you how to build a strong portfolio: five quick slides.","Show me",()=>{K().closeChat();setTimeout(()=>window.eviaStrength&&window.eviaStrength.guide(),120)}],
    [/\b(write.?up|statement|what (do|should) i write|help me write)\b/,"On any unit page, tap Let Evia guide you: I’ll take you through it KSB by KSB and put your answers together as your statement. The words must be yours, though.","Go to My course",goNav("course")],
    [/\b(teach me|lesson|learn|revise|revision)\b/,"Teach me has short lessons for your trade, maths, English and EDI.","Open Teach me",goNav("teach")],
    [/\b(how am i doing|my progress|progress|am i behind|on track)\b/,"",null,null]
  ];

  /* ---------- Help and wellbeing: the right people, straight away ---------- */
  const WORRY=/\b(bull(y|ied|ying)|unsafe|scared|abuse|harass|hurt me|hit me|self.?harm|suicid|kill myself|depress|anxious|anxiety|struggling|can.?t cope|stress(ed)?|worried about|racis|discriminat|groom|radical|extrem)/;
  function worry(){
    const L=window.eviaData&&window.eviaData.learner?window.eviaData.learner():{},sg=L.safeguarding||{};
    K().say("I’m really glad you said something. You don’t have to deal with this on your own.");
    K().widget('<div class="br-card br-help"><div class="br-head"><span class="br-ic">'+ICON.ksb+'</span><strong>People who can help</strong></div>'+
      (sg.name?'<p><b>'+esc(sg.name)+'</b>, your college’s safeguarding lead'+(sg.phone?'<br><a href="tel:'+esc(String(sg.phone).replace(/\s/g,""))+'">'+esc(sg.phone)+'</a>':"")+(sg.email?'<br><a href="mailto:'+esc(sg.email)+'">'+esc(sg.email)+'</a>':"")+'</p>':'<p>Your assessor, tutor or your college’s safeguarding lead.</p>')+
      '<p><b>Samaritans</b>, any time, free: <a href="tel:116123">116 123</a></p><p class="br-small">If you or someone else is in danger right now, call <a href="tel:999">999</a>.</p></div>');
    K().replies([{label:"Something else",run:()=>suggestions()}]);
  }

  /* ---------- Understanding what was typed ---------- */
  const mem={last:null};
  const has=(t,re)=>re.test(t);
  function follow(kind){
    const F={bricks:["And the mortar for it?","What about blockwork?"],mortar:["How many bricks for it?","What mix should I use?"],concrete:["What depth for a garden path?","Area and volume"],stairs:["What’s the going?","What’s a winder?"],square:["What’s 3-4-5?","Setting out"],fall:["What fall for a drain?","Area and volume"],area:["How many bricks for it?","Concrete for a slab"]}[kind]||[];
    chips(F.filter(x=>!(timber()&&/brick|mortar/i.test(x))));
  }
  function chips(list){
    if(!list.length)return;
    K().replies(list.map(l=>({label:l,run:()=>answer(l,true)})),{turns:K().turns});
  }
  function answer(text,already){
    const t=norm(text),raw=String(text||"");
    if(!t)return;
    /* Worries first, always. */
    if(has(t,WORRY))return worry();
    if(/^(hi|hello|hey|hiya|morning|afternoon|evening|alright|yo)\b/.test(t)&&t.split(" ").length<=3){K().say(pick(["Hi! What can I help with?","Hey. Ask me anything about the job, your course or a calculation."]));return suggestions()}
    if(/^(thanks|thank you|cheers|ta|nice one|great|brill|perfect|ok|okay)\b/.test(t)&&t.split(" ").length<=4){K().say(pick(["Any time.","No problem.","Happy to help."])+" Anything else?");return suggestions()}
    /* KSB codes: "what's K12", "S14". */
    const code=/\b([ksb])\s?(\d{1,2})\b/i.exec(raw);
    if(code&&!/\b\d+\s*(m|mm|kg)\b/i.test(raw))return ksb(code[1]+code[2]);
    if(/\b(ksbs?|kbs)\b.*\b(missing|left|need|still)\b|\bmissing\b.*\bksbs?\b|\bcatch ?up\b|\bwhat.*(missing|left to do)\b/.test(t))return missing();
    if(/\b(what should i do|what (do|can) i do (now|today|next)|what next|whats next|where do i start|help me get started|today)\b/.test(t)){K().say(pick(["Here’s what I’d do today.","This is where I’d start."]));return todayCard()}
    if(/\b(calculators?|calculate|work out|sum)\b/.test(t)&&!/\d/.test(t)){K().say("Which one do you need?");return calculators()}
    /* Calculations. */
    const L=lengths(raw.replace(/\b1\s*(in|:)\s*\d+/gi,"").replace(/\b[ksb]\d{1,2}\b/gi,"")),area=areaOf(raw);
    const brickish=/\b(bricks?|blocks?|blockwork|brickwork)\b/.test(t),howMany=/\b(how many|number of|quantity|need|order|for a|for my)\b/.test(t)||L.length||area;
    if(/\bmortar\b/.test(t)&&(/\d/.test(t)||/\bhow much\b/.test(t))&&!/\bwhat is\b|\bwhats\b/.test(t)){
      const n=countOf(raw,"bricks?"),r=ratioOf(raw),type=/block/.test(t)?"block":/cavity/.test(t)?"cavity":/one.?brick|225|9 ?inch/.test(t)?"one":"half";
      const a=area||(L.length>=2?L[0]*L[1]:null);
      if(n||a){const res=calc.mortar({bricks:n,area:a,type,ratio:r?r.a:4});if(res){K().say(pick(["Here’s roughly what you’ll need.","Worked it out for you."]));calcWidget("mortar",{area:nf(res.area,2).replace(/,/g,""),type,ratio:res.ratio});return follow("mortar")}}
      K().say("Tell me the wall size or how many bricks, like “mortar for 500 bricks” or “mortar for a 4 m by 1.2 m wall”. Or use the calculator:");calcWidget("mortar");return;
    }
    if(brickish&&howMany&&!/\bwhat is\b/.test(t)){
      const type=/cavity/.test(t)?"cavity":/one.?brick|225|9 ?inch|double skin/.test(t)?"one":/block/.test(t)&&!/brick/.test(t)?"block":"half";
      if(area||L.length>=2){const p=area?{length:area,height:1}:{length:L[0],height:L[1]};K().say(pick(["Here you go.","Easy, here’s the count."])+(area?" For "+nf(area)+" m²:":""));calcWidget("bricks",Object.assign(p,{type}));return follow("bricks")}
      if(L.length===1&&!area){K().say("How high is the wall? Pop it in below and the count updates.");calcWidget("bricks",{length:L[0],type,height:""});return}
      K().say("Put the wall size in and I’ll count them:");calcWidget("bricks",{type});return follow("bricks");
    }
    if(/\bconcrete\b/.test(t)&&L.length>=2){const p={length:L[0],width:L[1],depth:L[2]!=null?L[2]:0.1};K().say(L[2]==null?"I’ve assumed 100 mm deep: change it below if not.":"Here’s the volume and what to order.");calcWidget("concrete",p);return follow("concrete")}
    if(/\b(stairs?|staircase|risers?|flight)\b/.test(t)&&L.length){const R=L[0]*1000;if(calc.stairs({rise:R})){K().say("For a private stair that’s "+nf(R,0)+" mm floor to floor:");calcWidget("stairs",{rise:Math.round(R)});return follow("stairs")}}
    const inN=/\b1\s*(?:in|:)\s*(\d+(?:\.\d+)?)/i.exec(raw);
    if(/\b(fall|gradient|slope|drop|falls)\b/.test(t)||inN){
      if(inN&&L.length){K().say("Here’s the drop:");calcWidget("fall",{length:L[0],ratio:parseFloat(inN[1])});return follow("fall")}
      if(L.length>=2&&!inN){const r=calc.fall({length:Math.max(L[0],L[1]),drop:Math.min(L[0],L[1])});if(r){K().say("That works out as:");K().widget('<div class="br-card">'+cardHtml(r)+'</div>');return follow("fall")}}
    }
    if(/\b(diagonal|square|3.?4.?5|pythag|right angle|90)\b/.test(t)&&L.length){K().say(L.length>=2?"The diagonal for a square corner:":"For a square corner with that long side:");calcWidget("square",{a:L[0],b:L[1]!=null?L[1]:""});return follow("square")}
    if(/\b(area|volume|m2|m3|square met|cubic)\b/.test(t)&&L.length>=2){calcWidget("area",{length:L[0],width:L[1],depth:L[2]!=null?L[2]:""});return follow("area")}
    const conv=/\b(convert|in mm|to mm|in metres|to metres|in m\b|to m\b|in cm|to cm|in millimetres|how many mm|how many metres)\b/.test(t);
    if(conv&&L.length){const to=/\bmm|millimet/.test(t.split(/\b(in|to)\b/).pop())?"mm":/\bcm\b/.test(t.split(/\b(in|to)\b/).pop())?"cm":"m";K().widget('<div class="br-card">'+cardHtml(calc.convert(L[0],to))+'</div>');return}
    const expr=raw.replace(/^[^0-9(]*/,"").replace(/[?=]+$/,"");
    if(/^[\d\s.+\-*/x×÷^()]+$/i.test(expr)&&/\d\s*[+\-*/x×÷^]\s*\d/i.test(expr)){const r=calc.sum(expr);if(r){K().say(pick(["That’s","It comes to"])+" <strong>"+esc(r.big)+"</strong>.");return}}
    /* A follow-up to the last calculation: "what about 6 m?", "and 1.5 high". */
    if(mem.last&&L.length&&!already){const p=Object.assign({},mem.last.params),F=FORMS[mem.last.kind];
      if(/\bhigh|height|tall\b/.test(t)&&"height" in p)p.height=L[0];else if(/\bdeep|depth|thick\b/.test(t)&&"depth" in p)p.depth=L[0];else if(/\bwide|width\b/.test(t)&&"width" in p)p.width=L[0];else{const k=F.fields[0][0];p[k]=mem.last.kind==="stairs"?Math.round(L[0]*1000):L[0]}
      if(/\bblock/.test(t)&&"type" in p)p.type="block";
      K().say("Updated:");calcWidget(mem.last.kind,p);return follow(mem.last.kind);
    }
    if(mem.last&&/\b(mortar)\b/.test(t)&&mem.last.kind==="bricks"){const r=calc.bricks(mem.last.params);if(r){K().say("For that wall:");calcWidget("mortar",{area:nf(r.area,2).replace(/,/g,""),type:r.type});return follow("mortar")}}
    if(mem.last&&/\bblock/.test(t)&&mem.last.kind==="bricks"){K().say("In blockwork:");calcWidget("bricks",Object.assign({},mem.last.params,{type:"block"}));return follow("bricks")}
    /* How to do things in the app. */
    for(const [re,line,label,run] of HOWTO){
      if(!re.test(t))continue;
      if(!label){K().say("Here’s where you are.");todayCard();K().replies([{label:"Which KSBs am I missing?",run:()=>answer("which ksbs am i missing")},{label:"Open My progress",run:goNav("progress")}]);return}
      K().say(line);K().replies([{label,primary:true,run},{label:"Something else",run:()=>suggestions()}]);return;
    }
    /* A unit: "how do I evidence cavity walling". */
    const d=typeof data==="function"?data():null;
    if(d&&/\b(evidence|unit|photos?|capture|mention)\b/.test(t)){
      const words=t.split(" ").filter(w=>w.length>3&&!STOP.has(w));
      const hit=d.u.map((u,i)=>({u,i,n:words.filter(w=>u[0].toLowerCase().includes(w)).length})).sort((x,y)=>y.n-x.n)[0];
      if(hit&&hit.n){const p=((window.eviaLearnerPrompts||{})[course]||{})[hit.u[0]]||{},sp=s=>String(s||"").split("·").map(x=>x.trim()).filter(Boolean).join(", ");
        K().say("For <strong>"+esc(hit.u[0])+"</strong>, photograph "+esc(sp(p.photos)||"the start, middle and end of the job")+". In your write-up, explain "+esc(sp(p.writeup)||"what you did, how and why")+". Full PPE in every photo.");
        K().replies([{label:"Open "+hit.u[0],primary:true,run:()=>K().openUnitFromChat({index:hit.i})},{label:"Something else",run:()=>suggestions()}]);return}
    }
    /* Tools, materials and site terms. */
    const g=findTerm(text);
    if(g){
      const T=window.EVIA_TEACH||{},pic=g[3]&&T.pics&&T.pics[g[3]]?T.pics[g[3]]():"",les=findLesson(g[0]+" "+g[1].join(" "));
      K().say(pick(["Good question.","Sure.","Here you go."])+" <strong>"+esc(g[0])+"</strong>:");
      K().widget('<div class="br-card br-term">'+(pic?'<div class="br-pic">'+pic+'</div>':"")+'<div class="br-head"><span class="br-ic">'+ICON.book+'</span><strong>'+esc(g[0])+'</strong></div><p class="br-def">'+esc(g[2])+'</p>'+
        (g[1].length?'<p class="br-small">Also called: '+esc(g[1].slice(0,3).join(", "))+'</p>':"")+'</div>');
      const next=[les?{label:"Learn more: "+les.l.title,primary:true,run:()=>{K().closeChat();setTimeout(()=>window.eviaTeach&&window.eviaTeach.play(les.l.id),120)}}:null,{label:"Ask something else",run:()=>suggestions()}].filter(Boolean);
      K().replies(next);return;
    }
    /* Anything in Teach me. */
    const les=findLesson(text);
    if(les){
      K().say(pick(["I cover that in Teach me.","Here’s what I teach about that."])+" From <strong>"+esc(les.l.title)+"</strong> ("+esc(les.unit)+"):");
      K().widget('<div class="br-card br-lesson"><div class="br-head"><span class="br-ic">'+ICON.book+'</span><strong>'+esc(les.l.title)+'</strong></div><p class="br-def">'+esc(les.snippet.length>320?les.snippet.slice(0,317)+"…":les.snippet)+'</p></div>');
      K().replies([{label:"Open the lesson",primary:true,run:()=>{K().closeChat();setTimeout(()=>window.eviaTeach&&window.eviaTeach.play(les.l.id),120)}},{label:"Ask something else",run:()=>suggestions()}]);return;
    }
    /* Not yet. Kept on the phone, so the questions Evia can't answer yet can be added later. */
    try{const k="evia7-unanswered",q=JSON.parse(localStorage.getItem(k)||"[]");q.push({t:String(text).slice(0,200),at:Date.now()});localStorage.setItem(k,JSON.stringify(q.slice(-50)))}catch(_){}
    K().say(pick(["I don’t know that one yet, sorry.","That one’s beyond me for now."])+" I’m best with tools and materials, KSBs, calculations and your course. Try one of these:");
    suggestions(true);
  }
  function suggestions(quiet){
    const b=!timber();
    const list=b?["How many bricks for a 4 m by 1.2 m wall?","What’s a bolster for?","What’s K20?","What should I do today?","Mortar for 500 bricks","Stairs for a 2.6 m rise"]
      :["What’s a mortice gauge?","Stairs for a 2.6 m rise","What’s S20?","What should I do today?","Diagonal for 3 m by 4 m","Concrete for 3 m by 2 m by 100 mm"];
    if(!quiet)K().say(pick(["What else can I help with?","Anything else?"]));
    chips(list.slice(0,4));
  }
  window.eviaBrain={answer,todayCard,calculators,open,suggest:suggestions,calc,findTerm,findLesson,lengths};
})();
