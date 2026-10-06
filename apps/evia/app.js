/* Hours as a learner reads them: 5h:51m, never 5.917. Rounded to the nearest minute. Shared by every screen and PDF. */
window.eviaHM=h=>{const m=Math.max(0,Math.round((Number(h)||0)*60)),H=Math.floor(m/60),M=m%60;return H&&M?H+"h:"+String(M).padStart(2,"0")+"m":H?H+"h":M+"m"};
const C={
bricklayer:{name:"Bricklayer",std:"ST0095 v1.2",u:[
["Mixing mortar",["S14|Gauge and hand mix mortar to ratio.","K20|Mixing Mortar: Ratios, silos, pre-mixed, gauging, hand mixing and mechanical mixing.","S1|Comply with health and safety regulations, standards, and guidance.","K1|signage, Safety signage.","S6|Estimate and select required resources: For example, the quantity of mortar,","K12|Simple resource estimation techniques: Quantity of mortar","S20|Applies team working principles to their own and the wider build team.","B1|Put health, safety and wellbeing first."]],
["Jointing Styles",["S12|Apply joint finishes: For example, half round, flush, weather struck and recessed.","K17|Joint finishes: Half round, flush, weather struck and recessed.","S2|Identify and use personal protective equipment (PPE).","K2|Safety control equipment and how to use personal protective equipment (PPE).","S17|Protect materials and finished work.","K25|Methods of protecting materials and work: Frost, water and construction damage.","K27|Principles of good team working.","B6|Team-focus to meet team goals including, considering the wider build team."]],
["Repair brick walling",["S16|Carry out a simple repair: For example, replacing damaged bricks.","K24|Defects and repair: Construction defects and repair methods.","S1|Comply with health and safety regulations, standards, and guidance.","K1|Asbestos awareness. ","S7|Prepare and maintain a safe working area.","K3|Safe systems of work: Site inductions, toolbox talks, risk assessments, method statements and hazard identification in the work area.","K26|Verbal communication techniques and construction terminology.","B2|Consider the environment when using resources and carrying out processes."]],
["Basic Brick wall",["S13|Set out and construct a simple brick solid wall with capping.","K16|Brick solid wall setting out, construction and capping methods.","S2|Identify and use personal protective equipment (PPE).","K1|Awareness of health and safety regulations, standards, and guidance and impact on role. ","S8|Select and use hand tools.","S9|Maintain and store hand tools.","K13|Hand tool use, maintenance and storage: Levels, measures, hammers, bolsters, brick hammers, trowels, brick jointer, line blocks and pins, scutch, chariot and brick clamps.","K6|Principles of building: Foundations, roofs, walls, cavity step trays, floors, utilities and services, insulation, fire, moisture and air protection, damp proof courses, the use of brick ties and quality of materials.","B1|Put health, safety and wellbeing first."]],
["Set out solid walling",["S13|Set out and construct a simple brick solid wall with capping.","K16|Brick solid wall setting out, construction and capping methods.","S5|Read and interpret information from drawings and specifications.","K1|Situational awareness. Slips, trips, and falls.","S18|Verbally communicate with others, applying construction terminology.","K11|Basic principles of digital design and modelling systems.","K18|Principles of basic decorative walling and piers: projecting and contrasting brick, isolated and attached pier, banding.","B3|Take ownership of given work."]],
["Build solid walling",["S13|Set out and construct a simple brick solid wall with capping.","K16|Brick solid wall setting out, construction and capping methods.","S5|Read and interpret information from drawings and specifications.","K10|Methods of interpreting and extracting relevant information from drawings and specifications.","S3|Comply with environmental and sustainability regulations, standards, and guidance. Segregate resources for reuse, recycling and disposal.","K4|Impact of the sector on the environment: Efficient use of resources. Recycling, reuse, surface water contamination and safe disposal of waste.","K15|Bond types: English bond, flemish bond, garden wall bonds and broken bond.","K23|Brick on edge and soldier courses: setting out and construction techniques."]],
["Set out Cavity Walling",["S10|Set out brick and block cavity wall to given tolerances, including an opening. damp proof courses (DPCs), cavity trays, weep holes,","K21|Cavity wall setting out techniques: Bricks and blocks, openings and levels, use of profiles, gauge rods and squares. damp proof courses (DPCs), cavity trays, weep holes,","S1|Comply with health and safety regulations, standards, and guidance.","K1|Control of Substances Hazardous to Health (CoSHH).Provision and use of work equipment regulations (PUWER) and Electrical safety. Health and Safety at Work Act. Manual handling","S6|Estimate and select required resources: For example, the quantity of bricks and blocks, wall ties and insulation.","K12|Simple resource estimation techniques: Quantity of bricks and blocks, quantity of wall ties, DPCs, cavity trays and lintels.","K8|Materials and their characteristics: Bricks and blocks, efflorescence, mortar, damp proof courses (DPC), wall ties, plasticisers, concrete and steel lintels, Rolled Steel Joist (RSJ), fire stopping, insulation, cement and building sand.","B5|Seek learning and development opportunities."]],
["Construct Cavity Walling",["S11|Construct a stretcher bond brick and block cavity wall with return and opening to given tolerances, insulation, fire stopping.","K22|Cavity wall construction using stretcher bond brick and block walling, forming openings, insulation, fire stopping.","S5|Read and interpret information from drawings and specifications.","K1|Fire safety, fire extinguishers","S21|Identifies well-being support available to self and others.","K31|Well-being: Mental and physical health considerations in self and others and how to access support.","K5|The importance and considerations of the environment and sustainability: Thermal qualities, airtightness and ventilation in buildings.","B5|Seek learning and development opportunities."]],
["Cavity opening",["S11|brick and edge sill, closure around opening, including installing a lintel with soldiers,","K22|closing cavities. selection and placement of wall ties, lintels","S4|Comply with industry regulations, standards, and guidance.","K7|Standards and regulations associated with bricklaying activities: British standards, building regulations and warranty provider standards.","S19|Follow equity, diversity and inclusion guidance.","K28|Inclusion, equity and diversity in the workplace.","K19|Principles of the use of expansion joints.","K9|Modern methods of construction: Rapid build technology, precast components, corner profiles, alternative frame and cladding systems, masonry support systems.","B4|Contribute to an inclusive and diverse culture."]],
["Gable end/Raked wall",["S22|Construct a brick wall with raking cut. For example, gable end wall or garden wall with raking cut.","K30|Brick walls with raking cut: Setting out and construction techniques.","S2|Identify and use personal protective equipment (PPE).","K1|Working in confined spaces. Working at height. ","S15|Measure and cut bricks and blocks using hand tools, to given tolerances.","K29|Methods of cutting bricks and blocks using hand tools.","K14|Power tool use and limitations: Disc cutters, mixers and drills.","B3|Take ownership of given work."]]
]},
site:{name:"Site Carpenter",std:"ST0264 v1.4",u:[
["Structural carcassing",["S14|Site carpenter: Apply first fix techniques and practices for: 1. structural carcassing (load bearing studwork)","K27|Site carpentry: First fixing installation techniques: Structural carcassing (load bearing studwork)","S1|Comply with health and safety regulations, standards, and guidance.","K1|Awareness of health and safety regulations, standards, and guidance and impact on role.","S10|Select, use and store power tools.","K17|Power tools use and storage methods and techniques: Portable circular saws, drills, saws, planers, routers, sanders, multi-functional tools and nail guns.","K9|Materials and their characteristics of home grown and imported timber and timber-based products","B1|Put health, safety and wellbeing first."]],
["Timber/metal partition walls",["S14|Site carpenter: Apply first fix techniques and practices for: 2. straight timber or metal partition walls","K27|Site carpentry: First fixing installation techniques: metal and timber stud partitions.","S19|Site carpenter: Use and store laser levels for example cross line laser.","K29|Site carpentry: Types, use, calibration and storage of laser levels.","S16|Site carpenter: Size timber from sizing tables.","K23|Site Carpenter: Timber sizing tables purpose and use.","K5|Principles of building and modern methods of construction","B4|Seek learning and development opportunities."]],
["Floor joists (and coverings)",["S14|Site carpenter: Apply first fix techniques and practices for: 3. floor joists, 4. floor joist coverings","K27|Site carpentry: First fixing installation techniques: floor joists and coverings","S2|Identify and use safety control equipment, for example, RPE, dust suppression, PPE and LEV.","K1|Control of Substances Hazardous to Health (CoSHH).Provision and use of work equipment regulations (PUWER) and Electrical safety. Health and Safety at Work Act. Manual handling","S15|Site carpenter: Install structural fixings.","K22|Site carpentry: Structural fixtures and timber sizing in site carpentry, how to use sizing tables.","K10|Timber decay and repair methods","B2|Consider the environment when using resources and carrying out processes."]],
["Straight flights of stairs",["S14|Site carpenter: Apply first fix techniques and practices for: 5. straight flights of stairs.","K27|Site carpentry: First fixing installation techniques: straight flights of stairs","S1|Comply with health and safety regulations, standards, and guidance.","K1|Situational awareness. Slips, trips, and falls.","S6|Interpret and use information from drawings and specifications.","K8|Methods of interpreting and extracting relevant information from drawings and specifications.","K6|Basic principles of digital design and modelling systems","B1|Put health, safety and wellbeing first."]],
["Service encasement",["S17|Site carpenter: Apply site second fix techniques and practices for: 1. service encasement","K28|Site carpentry: Second fix installation techniques: Service encasement","S2|Identify and use safety control equipment, for example, RPE, dust suppression, PPE and LEV.","K1|Fire safety, fire extinguishers","S9|Select, use and store hand tools.","K14|Hand tool use and storage methods and techniques: Chisels, planes, hand saws, hammers, squares, tri-square, bevels, marking and mortise gauges, spirit levels.","S13|Identifies well-being support available to self and others.","B3|Contribute to an inclusive and diverse culture."]],
["Cladding",["S17|Site carpenter: Apply site second fix techniques and practices for: 2. cladding","K28|Site carpentry: Second fix installation techniques: cladding","S1|Comply with health and safety regulations, standards, and guidance.","K1|Asbestos awareness.","S5|Prepare and maintain a safe working area.","K3|Safe systems of work: Site inductions, tool box talks, risk assessments, method statements and hazard identification in the work area.","K20|Well-being: Mental and physical health considerations in self and others and how to access support.","B1|Put health, safety and wellbeing first."]],
["Wall and floor units",["S17|Site carpenter: Apply site second fix techniques and practices for: 3. wall and floor units and fitments","K28|Site carpentry: Second fix installation techniques: wall and floor units and fitments","S3|Comply with environmental and sustainability regulations, standards, and guidance. Segregate resources for reuse, recycling and disposal.","K4|Impact of the sector on the environment: Efficient use of resources. Recycling, reuse, safe disposal of waste and sustainable forestry.","S12|Produce jigs.","K16|Jig production techniques.","K18|Principles of good team working","B5|Team-focus to meet team goals including, considering the wider build team."]],
["Handrails and spindles",["S17|Site carpenter: Apply site second fix techniques and practices for: 4. handrails and spindles to straight flights of stairs","K28|Site carpentry: Second fix installation techniques: handrails and spindles to straight flights of stairs","S1|Comply with health and safety regulations, standards, and guidance.","K1|signage, Safety signage.","S8|Verbally communicate with others, applying construction terminology.","K13|Verbal communication techniques and construction terminology.","K14|Hand tool use and storage methods and techniques: Chisels, planes, hand saws, hammers, squares, tri-square, bevels, marking and mortise gauges, spirit levels.","B4|Seek learning and development opportunities."]],
["Internal and external doors",["S17|Site carpenter: Apply site second fix techniques and practices for: 5. internal and external doors","K28|Site carpentry: Second fix installation techniques: doors","S20|Site carpenter: Form connections, for example, using joints, nails, screws, bolts and adhesive.","K11|Carpentry and joinery products and purpose: Mastics, preservatives, wood fillers, plastics and ironmongery.","S11|Maintain and sharpen hand tools.","K15|Hand tool maintenance and sharpening techniques.","K8|Methods of interpreting and extracting relevant information from drawings and specifications.","B1|Put health, safety and wellbeing first."]],
["Skirting boards and architrave",["S17|Site carpenter: Apply site second fix techniques and practices for: 6. skirting boards and architrave","K28|Site carpentry: Second fix installation techniques: mouldings (architrave and skirting board).","S2|Identify and use safety control equipment, for example, RPE, dust suppression, PPE and LEV.","K2|Safety control equipment and how to use personal protective equipment (PPE) respiratory protective equipment (RPE) and local exhaust ventilation (LEV).","S22|Site carpenter: Carrying out splicing and scribing techniques.","K24|Site carpentry: Timber splicing and scribing techniques.","K40|Employment types, small business start up principles and tax","B2|Consider the environment when using resources and carrying out processes."]],
["Window boards",["S17|Site carpenter: Apply site second fix techniques and practices for: 7. window boards.","K28|Site carpentry: Second fix installation techniques: window boards","S4|Comply with industry regulations, standards, and guidance.","K7|Standards and regulations associated with carpentry activities: British standards, building regulations and warranty provider standards.","S21|Site carpenter: Apply measuring, marking out, cutting (square and angled), mitring, hinging and recessing techniques.","K21|Site carpentry techniques: Measuring, marking out, fitting, cutting (straight and angled) and mitring.","K19|Inclusion, equity and diversity in the workplace","B3|Contribute to an inclusive and diverse culture."]],
["Roofs and loft hatch",["S18|Site carpenter: Apply site carpenter techniques and practices to construction of rafter roofs, including trussed (prefabricated) and traditional (built on site) including the construction of verge, eaves and fitting loft access.","K25|Site carpentry: Straight roof installation techniques: Basic rafter trussed (prefabricated) and traditional cut roof (built on site).","S1|Comply with health and safety regulations, standards, and guidance.","K1|Working in confined spaces. Working at height.","S7|Estimate required materials and produce a cutting list.","K12|Basic material estimation techniques, calculating lengths of timber, fixing requirements and a cutting list production methods.","K26|Flat roofs: Warm and cold flat roofs including firings and coverings","B5|Team-focus to meet team goals including, considering the wider build team."]]
]},
joiner:{name:"Bench Joiner",std:"ST0264 v1.4",u:[
["Basic woodworking joints",["S24|Architectural joiner: Produce basic woodworking joints including dovetail, bridal, mortise and tenon and halving.","K33|Architectural joiner: Timber joints, types and production techniques: Dovetails, mortise and tenon, bridals and halvings.","S1|Comply with health and safety regulations, standards, and guidance.","K1|Awareness of health and safety regulations, standards, and guidance and impact on role.","S25|Architectural joiner: Form connections using dowels, biscuit, staples and adhesives.","K35|Architectural joiner: Connection methods in joinery: Dowels, biscuit, staples and adhesives.","K9|Materials and their characteristics of home grown and imported timber and timber-based products","B1|Put health, safety and wellbeing first."]],
["Timber Window",["S26|Architectural joiner: Apply techniques and practices to the manufacture and assembly of a timber window with casement including glazing rebates and associated ironmongery.","K34|Architectural joiner: Manufacture and assembly techniques for standard right angled timber windows.","S2|Identify and use safety control equipment, for example, RPE, dust suppression, PPE and LEV.","K1|Asbestos awareness.","S6|Interpret and use information from drawings and specifications.","K8|Methods of interpreting and extracting relevant information from drawings and specifications.","K6|Basic principles of digital design and modelling systems","B2|Consider the environment when using resources and carrying out processes."]],
["Straight staircases",["S27|Architectural joiner: Apply manufacture and assembly techniques for first fix products: 1. straight staircases","K36|Architectural joiner: Manufacture and assembly techniques for timber first fix products: 1. straight staircases","S1|Comply with health and safety regulations, standards, and guidance.","K1|Working in confined spaces. Working at height.","S7|Estimate required materials and produce a cutting list.","K12|Basic material estimation techniques, calculating lengths of timber, fixing requirements and a cutting list production methods.","K13|Verbal communication techniques and construction terminology.","S8|Verbally communicate with others, applying construction terminology.","B3|Contribute to an inclusive and diverse culture."]],
["Door frames and linings",["S27|Architectural joiner: Apply manufacture and assembly techniques for first fix products: 2. door frames and linings.","K36|Architectural joiner: Manufacture and assembly techniques for timber first fix products: 2. door frames and linings.","S2|Identify and use safety control equipment, for example, RPE, dust suppression, PPE and LEV.","K1|signage, Safety signage.","S11|Maintain and sharpen hand tools.","K15|Hand tool maintenance and sharpening techniques.","K10|Timber decay and repair methods","B4|Seek learning and development opportunities."]],
["Timber doors",["S28|Architectural joiner: Apply manufacture and assembly techniques for second fix products: 1. timber doors","K37|Architectural joiner: Apply manufacture and assembly techniques for second fix products: 1. timber doors","S1|Comply with health and safety regulations, standards, and guidance.","K1|Control of Substances Hazardous to Health (CoSHH).Provision and use of work equipment regulations (PUWER) and Electrical safety. Health and Safety at Work Act. Manual handling","S10|Select, use and store power tools.","K17|Power tools use and storage methods and techniques: Portable circular saws, drills, saws, planers, routers, sanders, multi-functional tools and nail guns.","K30|Requirements of fire door assemblies","B5|Team-focus to meet team goals including, considering the wider build team."]],
["Wall and floor units",["S28|Architectural joiner: Apply manufacture and assembly techniques for second fix products:2. wall and floor units","K37|Architectural joiner: Apply manufacture and assembly techniques for second fix products:2. wall and floor units","S2|Identify and use safety control equipment, for example, RPE, dust suppression, PPE and LEV.","K2|Safety control equipment and how to use personal protective equipment (PPE) respiratory protective equipment (RPE) and local exhaust ventilation (LEV).","S23|Architectural joiner: Produce setting out details, including setting rods, and mark out for timber products.","K32|Architectural joiner: Setting out and marking out techniques for joinery product manufacture and potential effects of marking out errors.","K40|Employment types, small business start up principles and tax","B1|Put health, safety and wellbeing first."]],
["Timber mouldings",["S28|Architectural joiner: Apply manufacture and assembly techniques for second fix products: 3. timber mouldings","K37|Architectural joiner: Manufacture and assembly techniques for second fix timber products: 3. timber mouldings.","S3|Comply with environmental and sustainability regulations, standards, and guidance. Segregate resources for reuse, recycling and disposal.","K4|Impact of the sector on the environment: Efficient use of resources. Recycling, reuse, safe disposal of waste and sustainable forestry.","S13|Identifies well-being support available to self and others.","K20|Well-being: Mental and physical health considerations in self and others and how to access support.","K38|Finishing techniques for manufactured timber products","B2|Consider the environment when using resources and carrying out processes."]],
["Staircase spindles and balustrades",["S28|Architectural joiner: Apply manufacture and assembly techniques for second fix products: 4. staircase spindles and balustrades.","K37|Architectural joiner: Manufacture and assembly techniques for second fix timber products: 4. staircase spindles and balustrades.","S1|Comply with health and safety regulations, standards, and guidance.","K1|Situational awareness. Slips, trips, and falls.","S12|Produce jigs.","K16|Jig production techniques.","K18|Principles of good team working","B3|Contribute to an inclusive and diverse culture."]],
["Ironmongery",["S29|Architectural joiner: Fit ironmongery including door locks, door handles, door hinges, latches and draw runners.","K39|Architectural joiner: Ironmongery installation techniques.","K11|Carpentry and joinery products and purpose: Mastics, preservatives, wood fillers, plastics and ironmongery.","S4|Comply with industry regulations, standards, and guidance.","K7|Standards and regulations associated with carpentry activities: British standards, building regulations and warranty provider standards.","S9|Select, use and store hand tools.","K14|Hand tool use and storage methods and techniques: Chisels, planes, hand saws, hammers, squares, tri-square, bevels, marking and mortise gauges, spirit levels.","K19|Inclusion, equity and diversity in the workplace","B4|Seek learning and development opportunities."]],
["Fixed Machinery",["S30|Architectural joiner: Inspect, prepare and operate fixed machinery.","K31|Architectural joiner: Safe use of fixed machinery, inspection, preparation and operation techniques: Crosscut saw, band saw, planer and thicknesser and mortiser.","S2|Identify and use safety control equipment, for example, RPE, dust suppression, PPE and LEV.","K1|Fire safety, fire extinguishers","S5|Prepare and maintain a safe working area.","K3|Safe systems of work: Site inductions, tool box talks, risk assessments, method statements and hazard identification in the work area.","K5|Principles of building and modern methods of construction","B5|Team-focus to meet team goals including, considering the wider build team."]]
]}};
Object.assign(C,window.EVIA_EXTRA_COURSES||{}); /* NVQ courses (nvq.js) */
const esc=s=>String(s??"").replace(/[&<>"']/g,x=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[x]));
let course=localStorage.getItem("evia7-course")||"bricklayer", screen="course", unit=-1, photos=[], evidence=JSON.parse(localStorage.getItem("evia7-evidence")||"[]"), hours=JSON.parse(localStorage.getItem("evia7-hours")||"[]"), otjBatches=JSON.parse(localStorage.getItem("evia7-otj-batches")||"[]");
hours=hours.map((x,i)=>Object.assign({id:"legacy-"+i,createdAt:x.createdAt||Date.parse(x.d)||Date.now(),savedAt:x.savedAt||x.d||""},x));
const $=s=>document.querySelector(s), data=()=>C[course], code=x=>x.split("|")[0], text=x=>x.split("|").slice(1).join("|");
function persist(){localStorage.setItem("evia7-course",course);localStorage.setItem("evia7-evidence",JSON.stringify(evidence));localStorage.setItem("evia7-hours",JSON.stringify(hours));localStorage.setItem("evia7-otj-batches",JSON.stringify(otjBatches))}
/* A learner connected to Nisia whose college has its own pack follows its topics (packs.js); everyone else, Evia's own. */
try{window.eviaPacks&&window.eviaPacks.followKept&&window.eviaPacks.followKept(course)}catch(err){console.warn("Evia: pack",err&&err.message)}
function nav(s){screen=s;render();}
function render(){
 const profileBtn=document.getElementById("profile-btn");
 if(profileBtn)profileBtn.style.display=["learning","course","progress","portfolio"].includes(screen)?"flex":"none";
 document.querySelectorAll("[data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav===screen));
 if(screen==="learning")learning();
 else if(screen==="course")courses();
 else if(screen==="progress")progress();
 else if(screen==="portfolio")portfolio();
 else learning();
}
function formatDateTime(ts){
 const d=new Date(ts);
 return d.toLocaleString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});
}
function otjEntriesForBatch(batch){
 if(!batch)return[];
 const ids=new Set(batch.entryIds||[]);
 return hours.filter(x=>ids.has(x.id));
}
function buildOTJPrintWindow(entries,title,downloadedAt){
 const p=window.eviaData.learner();
 const learner=p.name||"Apprentice";
 const total=entries.reduce((a,x)=>a+Number(x.n||0),0);
 const w=window.open("","_blank");
 if(!w){alert("Please allow pop-ups to download your learning hours PDF.");return false}
 w.document.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'+esc(title)+'</title><style>'+
 '@page{size:A4;margin:15mm}*{box-sizing:border-box}body{margin:0;color:#172033;font:10.5pt -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.45}.header{border-bottom:2px solid #e6b800;padding-bottom:14px;margin-bottom:18px}.eyebrow{font-size:8.5pt;letter-spacing:.12em;color:#667085;font-weight:700}.header h1{font-size:22pt;margin:4px 0 12px}.details{display:grid;grid-template-columns:1fr 1fr;gap:5px;color:#475467}.summary{background:#fff7d6;border:1px solid #f1df91;border-radius:10px;padding:10px;margin-bottom:16px}.entry{border:1px solid #e4e7ec;border-radius:11px;padding:13px;margin-bottom:10px;break-inside:avoid;page-break-inside:avoid}.entry-date{font-size:8.5pt;color:#667085;font-weight:700;letter-spacing:.05em}.entry-hours{font-size:15pt;font-weight:800;margin:3px 0}.entry-description{white-space:pre-wrap;color:#344054}.footer{margin-top:18px;padding-top:10px;border-top:1px solid #eaecf0;color:#667085;font-size:8.5pt}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}</style></head><body>'+
 '<header class="header"><div class="eyebrow">EVIA · LEARNING HOURS EVIDENCE</div><h1>'+esc(learner)+'</h1><div class="details">'+
 '<span><strong>Course:</strong> '+esc(data().name)+'</span><span><strong>Standard:</strong> '+esc(data().std)+'</span>'+
 (p.start?'<span><strong>Apprenticeship start:</strong> '+esc(p.start)+'</span>':"")+
 (p.end?'<span><strong>Apprenticeship end:</strong> '+esc(p.end)+'</span>':"")+
 '<span><strong>PDF generated:</strong> '+esc(formatDateTime(downloadedAt))+'</span></div></header>'+
 '<div class="summary"><strong>'+window.eviaHM(total)+'</strong> across '+entries.length+' learning entries included in this download.</div>'+
 entries.slice().sort((a,b)=>Number(a.on||a.createdAt)-Number(b.on||b.createdAt)).map(x=>'<article class="entry"><div class="entry-date">'+esc(x.on?new Date(x.on).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"})+" (logged "+(x.savedAt||formatDateTime(x.createdAt))+")":x.savedAt||formatDateTime(x.createdAt))+'</div><div class="entry-hours">'+esc(window.eviaHM(x.n))+'</div><div class="entry-description">'+esc(x.description||"No description recorded.")+'</div></article>').join("")+
 '<div class="footer">This document contains the learning hours entries included at the time of this download. The next Evia learning hours download will contain new entries recorded after this download.</div>'+
 '</body></html>');
 w.document.close();w.focus();setTimeout(()=>w.print(),250);return true;
}
function downloadOTJPDF(mode){
 const now=Date.now();
 let entries=[],batch=null;
 /* "last", or a past download's id, downloads that same set again; "new" only what hasn't been downloaded yet. */
 if(mode!=="new"){
   batch=mode==="last"?otjBatches[otjBatches.length-1]:otjBatches.find(b=>b.id===mode);
   entries=otjEntriesForBatch(batch);
   if(!entries.length){alert("There is no saved learning hours PDF to download again.");return}
   if(window.eviaOpenOtjPdf){window.eviaOpenOtjPdf(entries,batch.downloadedAt||now);return}
   buildOTJPrintWindow(entries,"Evia learning hours · "+(batch.downloadedAt?formatDateTime(batch.downloadedAt):""),batch.downloadedAt||now);
   return;
 }
 const lastBatch=otjBatches[otjBatches.length-1];
 const lastCutoff=lastBatch?Number(lastBatch.cutoff):0;
 entries=hours.filter(x=>Number(x.createdAt)>lastCutoff);
 if(!entries.length){alert("There are no new learning hours to include in a new PDF. Add more learning entries first.");return}
 batch={id:"otj-"+now+"-"+Math.random().toString(36).slice(2,8),downloadedAt:now,cutoff:now,entryIds:entries.map(x=>x.id)};
 /* The batch is recorded once the PDF is ready, so the next download starts after these entries. */
 if(window.eviaOpenOtjPdf){window.eviaOpenOtjPdf(entries,now,()=>{otjBatches.push(batch);persist()});return}
 if(!buildOTJPrintWindow(entries,"Evia learning hours · "+formatDateTime(now),now))return;
 otjBatches.push(batch);persist();learning();
}
function learning(){
 $("#page-title").textContent="Learning";
 const lastBatch=otjBatches[otjBatches.length-1];
 const pending=hours.filter(x=>Number(x.createdAt)>Number(lastBatch?lastBatch.cutoff:0)).length;
 $("#screen").innerHTML='<div class="card"><h2>Log learning hours</h2><div class="learning-input" style="margin-top:14px"><input id="hrs" type="number" min="0" step=".25" placeholder="Hours"><button class="primary" id="add">Add</button></div><textarea id="otj-description" placeholder="What did you do or learn?"></textarea></div>'+
 (pending||lastBatch?'<div class="card otj-download-card otj-compact"><p><strong>'+(pending?pending+' new '+(pending===1?"entry":"entries"):"No new entries")+'</strong> for your learning hours PDF</p><div class="row">'+(pending?'<button class="primary" id="download-otj">Download PDF</button>':"")+(lastBatch?'<button class="secondary" id="download-last-otj">Last PDF again</button>':"")+'</div></div>':"")+
 hours.slice().reverse().map(x=>'<div class="card otj-entry"><div class="progress-row"><strong>'+esc(window.eviaHM(x.n))+'</strong><span class="status '+(lastBatch&&Number(x.createdAt)<=Number(lastBatch.cutoff)?"done":"")+'">'+(lastBatch&&Number(x.createdAt)<=Number(lastBatch.cutoff)?"Downloaded":"New")+'</span></div><small class="otj-date">'+esc(x.savedAt||formatDateTime(x.createdAt))+'</small><p>'+esc(x.description||"No description recorded.")+'</p></div>').join("");
 $("#add").onclick=()=>{let n=Number($("#hrs").value),description=$("#otj-description").value.trim();if(n>0&&description){window.eviaData.put("hours",{minutes:Math.round(n*60),description,source:"manual"});persist();learning();if(window.eviaCheckTargets)window.eviaCheckTargets()}else if(n>0){alert("Add a short description of what you did or learned before saving.")}};
 const dl=$("#download-otj");if(dl)dl.onclick=()=>downloadOTJPDF("new");
 const last=$("#download-last-otj");if(last)last.onclick=()=>downloadOTJPDF("last");
}


/* Supporting Evidence: optional course portfolio attachments. */
/* KSBs ticked off by the one-time PPE induction, kept in Supporting evidence (onboarding.js). */
function inductionKsbs(){return supportingMeta().filter(x=>x&&x.induction&&x.course===course).flatMap(x=>Array.isArray(x.ksbs)?x.ksbs:[])}
/* Connected to a college, a KSB only counts as evidenced once the assessor signs it off in Milos (or observes it).
   What the learner has mapped shows as possible until then. On their own, Evia counts what they map, as before. */
function ksbSignoff(){
 const on=!!(window.eviaNisia&&window.eviaNisia.joined()),signed=new Set();
 if(on){
  try{Object.values(JSON.parse(localStorage.getItem("evia7-nisia-feedback")||"{}")||{}).forEach(f=>{if(f&&f.decision==="accepted")(f.ksbs||[]).forEach(k=>signed.add(k))})}catch(_){}
  supportingMeta().filter(x=>x&&x.observation&&x.course===course).forEach(x=>(x.ksbs||[]).forEach(k=>signed.add(k)));
 }
 return {on,signed};
}
window.eviaKsbSignoff=ksbSignoff;
/* KSBs the learner has chosen to aim for (near the end of the course, say): Evia points them at the jobs that cover
   them, and they can add them to any evidence pack that shows them. */
/* More required: KSBs in evidence the assessor has looked at but hasn't signed off yet. Evia asks for them next time,
   and they count as aims until they're signed off. Any evidence that shows them will do. */
function moreRequired(){
 const so=ksbSignoff();if(!so.on||!window.eviaFeedback)return[];
 const out=new Map();
 /* Every KSB in a unit the assessor has looked at: the unit's own, plus any the learner mapped. */
 const unitKsbs=u=>{try{const x=data().u.find(v=>v[0]===u);return x?x[1].map(k=>code(k)):[]}catch(_){return[]}};
 (typeof evidence!=="undefined"?evidence:[]).filter(e=>e&&e.c===course&&window.eviaFeedback.forEvidence(e.id)).forEach(e=>[...new Set(unitKsbs(e.u).concat(e.k||[]))].forEach(k=>{if(!so.signed.has(k)&&!out.has(k))out.set(k,e.u)}));
 return [...out].map(([code,unit])=>({code,unit}));
}
window.eviaMoreRequired=moreRequired;
function ksbAims(){let own=[];try{const a=JSON.parse(localStorage.getItem("evia7-ksb-aims")||"{}")||{};own=Array.isArray(a[course])?a[course]:[]}catch(_){}return [...new Set(own.concat(moreRequired().map(x=>x.code)))]}
function setKsbAim(code,on){let a={};try{a=JSON.parse(localStorage.getItem("evia7-ksb-aims")||"{}")||{}}catch(_){}const l=new Set(Array.isArray(a[course])?a[course]:[]);on?l.add(code):l.delete(code);a[course]=[...l];localStorage.setItem("evia7-ksb-aims",JSON.stringify(a))}
window.eviaKsbAims={list:ksbAims,set:setKsbAim};
function supportingMeta(){try{const all=JSON.parse(localStorage.getItem("evia7-supporting-evidence")||"[]");return Array.isArray(all)?all:[]}catch(_){return[]}}
function supportingSlug(value){return String(value||"").trim().replace(/[^a-z0-9]+/gi,"-").replace(/^-+|-+$/g,"").slice(0,80)||"supporting-evidence"}
function supportingTypeLabel(type){return ({photo:"Photo",video:"Video",audio:"Audio",document:"Files"}[type]||"File")}
async function supportingSaveRecord(record,blob){if(!window.eviaSupportingFilePut)throw new Error("Supporting evidence storage is unavailable");await window.eviaSupportingFilePut({id:record.id,blob});window.eviaData.put("supporting",record)}
function supportingCardIcon(type){const icons={photo:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6.5" width="18" height="14" rx="3"></rect><path d="M8 6.5l1.4-2h5.2l1.4 2"></path><circle cx="12" cy="13.5" r="3.5"></circle></svg>',video:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6.5" width="13" height="11" rx="2.5"></rect><path d="M16 10l5-3v10l-5-3z"></path></svg>',audio:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="3" width="8" height="12" rx="4"></rect><path d="M5 11.5a7 7 0 0 0 14 0M12 18.5V22M9 22h6"></path></svg>',document:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2.5h8l4 4v15H6z"></path><path d="M14 2.5v5h4M9 12h6M9 16h6"></path></svg>'};return '<span class="evidence-type-icon">'+(icons[type]||icons.document)+'</span>'}
async function openSupportingEvidence(){
 const base={course};
 $("#page-title").textContent="Supporting Evidence";
 $("#screen").innerHTML=`<button class="secondary" id="back-supporting-course" type="button">‹ My course</button><h1 class="ui-sub-title">Supporting evidence</h1><p class="ui-sub-lead">Witness testimony, photos and documents for your course.</p><div class="evidence-type-grid"><button type="button" class="evidence-type-tile" data-supporting-type="photo">${supportingCardIcon("photo")}<span class="evidence-type-copy"><strong>Take a photo</strong></span></button>${window.eviaRecordings?`<button type="button" class="evidence-type-tile" data-supporting-type="video">${supportingCardIcon("video")}<span class="evidence-type-copy"><strong>Record a video</strong></span></button><button type="button" class="evidence-type-tile" data-supporting-type="audio">${supportingCardIcon("audio")}<span class="evidence-type-copy"><strong>Record audio</strong></span></button>`:""}<button type="button" class="evidence-type-tile" data-supporting-type="document">${supportingCardIcon("document")}<span class="evidence-type-copy"><strong>Upload a file</strong></span></button></div>`;

 $("#back-supporting-course").onclick=()=>nav("course");
 document.querySelectorAll("[data-supporting-type]").forEach(btn=>btn.onclick=()=>supportingPrepare(base,btn.dataset.supportingType));
}
let eviaToastTimer=null;
function showEvidenceToast(message,isError){
 const existing=document.querySelector(".evidence-toast");
 if(existing)existing.remove();
 if(eviaToastTimer)clearTimeout(eviaToastTimer);
 const toast=document.createElement("div");
 toast.className="evidence-toast"+(isError?" evidence-toast-error":"");
 const icon=isError?'<path d="M12 8v5M12 16.5v.01"></path>':'<path d="M5 13l5 5L19 7"></path>';
 toast.innerHTML='<span class="evidence-toast-check"><svg viewBox="0 0 24 24" aria-hidden="true">'+icon+'</svg></span><span>'+message+'</span>';
 document.body.appendChild(toast);
 requestAnimationFrame(()=>requestAnimationFrame(()=>toast.classList.add("show")));
 eviaToastTimer=setTimeout(()=>{
   toast.classList.remove("show");
   setTimeout(()=>toast.remove(),320);
 },isError?3600:2200);
}
function supportingPrepare(base,type){
 const label={photo:"Photo",video:"Video",audio:"Audio",document:"File"}[type]||"File";
 const now=()=>new Date().toLocaleString("en-GB",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",second:"2-digit"}).replace(/[/:]/g,"-").replace(", ","_");
 $("#modal-root").innerHTML='<div class="overlay"><section class="sheet supporting-sheet"><div class="sheet-head"><div><div class="chat-kicker">PORTFOLIO</div><h2>'+label+'</h2></div><button class="close" id="supporting-close" aria-label="Close">×</button></div><div id="supporting-capture-area"></div></section></div>';
 const area=$("#supporting-capture-area");
 let blob=null,mime="",stream=null,recorder=null,chunks=[];
 const close=()=>{if(recorder&&recorder.state!=="inactive")recorder.stop();if(stream)stream.getTracks().forEach(t=>t.stop());$("#modal-root").innerHTML=""};
 $("#supporting-close").onclick=close;
 const save=async(fileBlob,fileMime,fileName)=>{
   if(!fileBlob)return;
   try{
     const id="support-"+Date.now()+"-"+Math.random().toString(36).slice(2,9);
     const record={id,course,title:fileName,type,mime:fileMime||fileBlob.type||"application/octet-stream",filename:fileName,addedAt:new Date().toISOString(),size:fileBlob.size};
     await supportingSaveRecord(record,fileBlob);
     close();
     showEvidenceToast("Added to Portfolio");
     openSupportingEvidence();
     openSupportingDetails(id,true);
   }catch(e){console.error("Supporting evidence save failed",e);showEvidenceToast("Couldn't save — please try again",true);}
 };
 /* Video and voice notes use the full-screen recorder (camera.js); Keep saves the recording. */
 if((type==="video"||type==="audio")&&window.eviaRecorder&&window.eviaRecorder.supported()){
   close();
   window.eviaRecorder.open({type,onDone:(b,m)=>save(b,m,(type==="video"?"Video_":"Audio_")+now()+"."+(String(m).includes("mp4")?(type==="video"?"mp4":"m4a"):"webm"))});
   return;
 }
 if(type==="photo"){
   area.innerHTML='<div class="evidence-capture-tile"><div class="section-title">CAPTURE PHOTO</div><div class="evidence-photo-actions"><button type="button" class="primary" id="supporting-take-photo">Camera</button><button type="button" class="secondary" id="supporting-choose-photo">Gallery</button><input id="supporting-camera" type="file" accept="image/*" capture="environment" hidden><input id="supporting-gallery" type="file" accept="image/*" hidden></div><div id="supporting-photo-preview" class="photo-grid"></div><button type="button" class="primary" id="supporting-save-photo" disabled>Save photo</button></div>';
   const camera=$("#supporting-camera"),gallery=$("#supporting-gallery"),preview=$("#supporting-photo-preview"),saveBtn=$("#supporting-save-photo");
   const add=async f=>{
     if(!f)return;
     if(!/^image\//i.test(f.type)){alert("Please choose an image.");return}
     blob=f;mime=f.type;preview.innerHTML='<img class="thumb" src="'+URL.createObjectURL(f)+'" alt="Photo preview">';saveBtn.disabled=false;
   };
   /* The camera stays open for several photos; each one is saved as its own supporting photo. */
   $("#supporting-take-photo").onclick=()=>{
     if(!(window.eviaCamera&&window.eviaCamera.supported())){camera.click();return}
     window.eviaCamera.open({title:"Supporting photos",onDone:async files=>{
       try{
         for(const f of files){
           const id="support-"+Date.now()+"-"+Math.random().toString(36).slice(2,9),name="Photo_"+now()+"_"+id.slice(-4)+".jpg";
           await supportingSaveRecord({id,course,title:name,type,mime:f.type||"image/jpeg",filename:name,addedAt:new Date().toISOString(),size:f.size},f);
         }
         close();showEvidenceToast(files.length===1?"Added to Portfolio":files.length+" photos added to Portfolio");openSupportingEvidence();
       }catch(e){console.error("Supporting photos save failed",e);showEvidenceToast("Couldn't save — please try again",true)}
     }});
   };
   $("#supporting-choose-photo").onclick=()=>gallery.click();
   camera.onchange=()=>{add(camera.files[0]);camera.value=""};
   gallery.onchange=()=>{add(gallery.files[0]);gallery.value=""};
   saveBtn.onclick=()=>save(blob,mime,"Photo_"+now()+".jpg");
 }else if(type==="document"){
   /* Gallery for photos and videos already on the phone; Files for documents (PDFs, certificates, Word files…). */
   area.innerHTML='<div class="evidence-capture-tile"><div class="section-title">UPLOAD</div><div class="evidence-photo-actions"><button type="button" class="primary" id="supporting-pick-gallery">Gallery</button><button type="button" class="secondary" id="supporting-pick-files">Files</button></div><input id="supporting-gallery-files" type="file" accept="'+(window.eviaRecordings?"image/*,video/*":"image/*")+'" multiple hidden><input id="supporting-file" type="file" multiple hidden><p class="supporting-hint">Gallery for photos on your phone. Files for documents like PDFs and certificates. You can choose more than one.</p></div>';
   const kindOf=f=>/^image\//i.test(f.type)?"photo":/^video\//i.test(f.type)?"video":/^audio\//i.test(f.type)?"audio":"document";
   const saveFiles=async list=>{
     const all=[...list].filter(f=>f&&f.size),files=window.eviaRecordings?all:all.filter(f=>!/^(video|audio)\//i.test(f.type));
     if(files.length<all.length)showEvidenceToast("Videos and audio can’t be added for now",true);
     if(!files.length)return;
     try{
       for(const f of files){
         const id="support-"+Date.now()+"-"+Math.random().toString(36).slice(2,9);
         await supportingSaveRecord({id,course,title:f.name,type:kindOf(f),mime:f.type||"application/octet-stream",filename:f.name,addedAt:new Date().toISOString(),size:f.size},f);
       }
       close();showEvidenceToast(files.length===1?"Added to Portfolio":files.length+" files added to Portfolio");openSupportingEvidence();
     }catch(e){console.error("Supporting upload failed",e);showEvidenceToast("Couldn't save — please try again",true)}
   };
   const galleryInput=$("#supporting-gallery-files"),fileInput=$("#supporting-file");
   $("#supporting-pick-gallery").onclick=()=>galleryInput.click();
   $("#supporting-pick-files").onclick=()=>fileInput.click();
   galleryInput.onchange=()=>{saveFiles(galleryInput.files);galleryInput.value=""};
   fileInput.onchange=()=>{saveFiles(fileInput.files);fileInput.value=""};
 }else{
   const video=type==="video";
   area.innerHTML='<div class="evidence-capture-tile"><div class="section-title">'+(video?"VIDEO CAMERA":"VOICE RECORDER")+'</div><video id="supporting-live" autoplay muted playsinline '+(video?"style=\"display:block;width:100%;aspect-ratio:1/1;height:auto;object-fit:cover;border-radius:18px;background:#000\"":"style=\"display:none\"")+'></video><div class="supporting-recorder-actions"><button class="primary" id="supporting-record">Start recording</button><button class="secondary" id="supporting-stop" type="button" disabled>Stop</button></div><p class="supporting-hint">'+(video?"Video recording is targeted at approximately 11 MB per minute.":"Audio is recorded at a high-quality bitrate to retain as much recording data as practical.")+'</p></div>';
   const live=$("#supporting-live"),recordBtn=$("#supporting-record"),stopBtn=$("#supporting-stop");
   const pickMime=()=>{const candidates=video?["video/webm;codecs=vp9,opus","video/webm;codecs=vp8,opus","video/webm"]:["audio/webm;codecs=opus","audio/webm"];return candidates.find(x=>window.MediaRecorder&&MediaRecorder.isTypeSupported(x))||""};
   recordBtn.onclick=async()=>{
     try{
       stream=await navigator.mediaDevices.getUserMedia(video?{video:{facingMode:"environment",aspectRatio:{ideal:1},width:{ideal:1080},height:{ideal:1080},resizeMode:"crop-and-scale"},audio:true}:{audio:true});
       if(video)live.srcObject=stream;
       const chosen=pickMime(),opts={};
       if(chosen)opts.mimeType=chosen;
       if(video){opts.videoBitsPerSecond=1500000;opts.audioBitsPerSecond=64000}else opts.audioBitsPerSecond=256000;
       recorder=new MediaRecorder(stream,opts);
       mime=recorder.mimeType||chosen||(video?"video/webm":"audio/webm");
       chunks=[];
       recorder.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data)};
       recorder.onstop=async()=>{
         blob=new Blob(chunks,{type:mime});chunks=[];
         if(stream)stream.getTracks().forEach(t=>t.stop());stream=null;
         if(video)live.srcObject=null;
         recordBtn.disabled=false;stopBtn.disabled=true;
         await save(blob,mime,(video?"Video_":"Audio_")+now()+"."+ (mime.includes("mp4")?(video?"mp4":"m4a"):"webm"));
       };
       recorder.start();
       recordBtn.disabled=true;stopBtn.disabled=false;
     }catch(e){console.error("Supporting media capture failed",e);alert("Evia could not access the "+(video?"video camera":"voice recorder")+".");}
   };
   stopBtn.onclick=()=>{if(recorder&&recorder.state!=="inactive")recorder.stop()};
 }
}
function supportingSummary(x){if(x.employer)return (x.witness&&x.witness.name||"Your employer")+" · "+(x.employer.kind==="behaviours"?"Behaviour ratings":"Witness testimony")+" · "+new Date(x.employer.at).toLocaleDateString("en-GB",{day:"numeric",month:"short"});if(x.observation)return ["Observed by "+(x.observation.by||"your assessor"),x.ksbs&&x.ksbs.length?x.ksbs.length+" signed off":""].filter(Boolean).join(" · ");return [x.witness&&x.witness.name?"Witness testimony · "+x.witness.name+(x.witness.role?", "+x.witness.role:""):supportingTypeLabel(x.type),x.nvqUnit?"Unit "+x.nvqUnit+(Array.isArray(x.ksbs)&&x.ksbs.length?" · "+x.ksbs.length+" criteria":""):""].filter(Boolean).join(" · ")}
/* About this evidence: mark it as witness testimony and, on NVQ courses, link it to a unit and the criteria it shows. */
function openSupportingDetails(id,fresh,after){
 const all=supportingMeta(),x=all.find(r=>r.id===id);if(!x)return;
 /* An employer's witness testimony (Paros): read it here; the assessor signs off what it shows. */
 if(x.employer&&x.employer.kind==="behaviours"){const E=x.employer,B=["","Needs support","Developing","Good","Excellent"],off=(window.EVIA_KSB_OFFICIAL||{})[course==="trowel3"?"bricklayer":course]||{};
  $("#modal-root").innerHTML='<div class="overlay"><section class="sheet pr-sheet sd-sheet"><div class="sheet-head"><div><div class="chat-kicker">EMPLOYER FEEDBACK</div><h2>Your behaviours</h2></div><button class="close" id="sd-close" aria-label="Close">×</button></div><div class="pr-body">'+
   '<p class="sd-emp-meta">'+esc((x.witness&&x.witness.name)||"Your employer")+' · '+esc(new Date(E.at).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}))+'</p>'+
   '<div class="sd-emp-beh">'+Object.entries(E.ratings||{}).sort().map(([k,v])=>'<div class="sd-emp-row"><span><strong>'+esc(k)+'</strong> '+esc(off[k]||"")+'</span><em class="l'+Number(v)+'">'+esc(B[v]||v)+'</em></div>').join("")+'</div>'+
   (E.comment?'<blockquote class="sd-emp-quote">'+esc(E.comment)+'</blockquote>':"")+
   '<p class="sd-emp-note">Your assessor can see this too, and uses it at your progress reviews.</p>'+
   '<div class="pr-save"><button type="button" class="primary" id="sd-skip">Done</button></div></div></section></div>';
  const done=()=>{$("#modal-root").innerHTML="";if(after)after()};$("#sd-close").onclick=$("#sd-skip").onclick=done;return}
 if(x.employer){const E=x.employer,R=["","Getting there","Competent","Excellent"];
  $("#modal-root").innerHTML='<div class="overlay"><section class="sheet pr-sheet sd-sheet"><div class="sheet-head"><div><div class="chat-kicker">WITNESS TESTIMONY</div><h2>'+esc(E.unit||"From your employer")+'</h2></div><button class="close" id="sd-close" aria-label="Close">×</button></div><div class="pr-body">'+
   '<p class="sd-emp-meta">'+esc((x.witness&&x.witness.name)||"Your employer")+' · '+esc(new Date(E.at).toLocaleDateString("en-GB",{day:"numeric",month:"long",year:"numeric"}))+(R[E.rating]?' · <strong>'+esc(R[E.rating])+'</strong>':"")+'</p>'+
   '<blockquote class="sd-emp-quote">'+esc(E.statement)+'</blockquote>'+
   ((E.ksbs||[]).length?'<div class="sd-emp-ksbs">'+E.ksbs.map(k=>'<span>'+esc(k)+'</span>').join("")+'</div>':"")+
   '<p class="sd-emp-note">'+(E.signed?"Signed by your employer as seen first hand. ":"")+'Your assessor checks it and signs off the KSBs it shows.</p>'+
   '<div class="pr-save"><button type="button" class="primary" id="sd-skip">Done</button></div></div></section></div>';
  const done=()=>{$("#modal-root").innerHTML="";if(after)after()};$("#sd-close").onclick=$("#sd-skip").onclick=done;return}
 const nvq=window.eviaNvq&&window.eviaNvq.on(),w=x.witness||{};
 const units=nvq?window.eviaNvq.selected():[];
 const critList=u=>{const list=u?window.eviaNvq.doCodesFor(u):[];return list.length?'<div class="sd-crit-head">What does it show? Tick what applies, your assessor will check it.</div>'+list.map(([c,t])=>'<label class="sd-crit"><input type="checkbox" value="'+esc(c)+'"'+((x.ksbs||[]).includes(c)?" checked":"")+'><span><strong>'+esc(c.split(".").slice(1).join("."))+'</strong> '+esc(t)+'</span></label>').join(""):""};
 $("#modal-root").innerHTML='<div class="overlay"><section class="sheet pr-sheet sd-sheet"><div class="sheet-head"><div><div class="chat-kicker">'+(fresh?"ADDED TO PORTFOLIO":"SUPPORTING EVIDENCE")+'</div><h2>About this evidence</h2></div><button class="close" id="sd-close" aria-label="Close">×</button></div><div class="pr-body">'+
  '<label class="sd-field">Name of the file<input id="sd-title" value="'+esc(x.title||"")+'"></label>'+
  '<label class="sd-toggle"><input type="checkbox" id="sd-witness"'+(w.name?" checked":"")+'><span><strong>This is witness testimony</strong><small>A supervisor or colleague describing work they saw you do.</small></span></label>'+
  '<div id="sd-witness-fields" class="sd-pair"'+(w.name?"":" hidden")+'><label class="sd-field">Their name<input id="sd-wname" value="'+esc(w.name||"")+'" autocomplete="off"></label><label class="sd-field">Their job title<input id="sd-wrole" value="'+esc(w.role||"")+'" placeholder="e.g. Site supervisor"></label></div>'+
  (nvq?'<label class="sd-field">Which unit does it show?<select id="sd-unit"><option value="">Not linked yet</option>'+units.map(u=>'<option value="'+u.n+'"'+(x.nvqUnit===u.n?" selected":"")+'>'+u.n+' '+esc(u.short)+'</option>').join("")+'</select></label><div id="sd-crits">'+critList(x.nvqUnit)+'</div>':"")+
  '<div class="pr-save"><button type="button" class="secondary" id="sd-skip">'+(fresh?"Skip":"Cancel")+'</button><button type="button" class="primary" id="sd-save">Save details</button></div>'+
  '</div></section></div>';
 const done=()=>{$("#modal-root").innerHTML="";if(after)after()};
 $("#sd-close").onclick=$("#sd-skip").onclick=done;
 $("#sd-witness").onchange=e=>{$("#sd-witness-fields").hidden=!e.target.checked;if(e.target.checked)$("#sd-wname").focus()};
 if(nvq)$("#sd-unit").onchange=e=>{x.ksbs=[];$("#sd-crits").innerHTML=critList(e.target.value)};
 $("#sd-save").onclick=()=>{
  const list=supportingMeta(),r=list.find(v=>v.id===id);if(!r)return done();
  r.title=$("#sd-title").value.trim()||r.title;
  const name=$("#sd-wname").value.trim();
  if($("#sd-witness").checked&&name)r.witness={name,role:$("#sd-wrole").value.trim()};else delete r.witness;
  if(nvq){r.nvqUnit=$("#sd-unit").value||"";r.ksbs=[...document.querySelectorAll("#sd-crits input:checked")].map(i=>i.value);if(!r.nvqUnit){delete r.nvqUnit;r.ksbs=[]}}
  window.eviaData.put("supporting",{id,title:r.title,witness:r.witness||null,nvqUnit:nvq?(r.nvqUnit||""):undefined,criteria:r.ksbs||[]});
  showEvidenceToast(r.ksbs&&r.ksbs.length?"Linked to "+r.ksbs.length+" criteria":"Details saved");
  if(window.eviaCheckTargets)window.eviaCheckTargets();
  done();
 };
}
async function openSupportingPortfolio(){
 const items=supportingMeta().filter(x=>x.course===course).slice().reverse();
 $("#page-title").textContent="Supporting Evidence";
 $("#screen").innerHTML='<button class="secondary" id="back-supporting-portfolio" type="button">‹ My evidence</button><div class="card portfolio-intro"><div class="section-title">PORTFOLIO</div><h2>Supporting Evidence</h2><p>Supporting evidence you have added to your portfolio.</p></div>'+
 (items.length?'<div class="supporting-portfolio-list">'+items.map(x=>'<button type="button" class="card supporting-portfolio-item" data-supporting-details="'+esc(x.id)+'"><div class="supporting-portfolio-copy"><strong>'+esc(x.title||"Supporting evidence")+'</strong><span>'+esc(supportingSummary(x))+'</span></div><span class="supporting-course-arrow">›</span></button>').join("")+'</div><div class="row" style="margin-top:10px"><button class="primary" id="download-supporting-portfolio-zip" type="button">Download ZIP</button></div>':'<div class="card"><p>No supporting evidence has been added yet.</p></div>');
 $("#back-supporting-portfolio").onclick=()=>nav("portfolio");
 document.querySelectorAll("[data-supporting-details]").forEach(b=>b.onclick=()=>openSupportingDetails(b.dataset.supportingDetails,false,openSupportingPortfolio));
 const zip=$("#download-supporting-portfolio-zip");if(zip)zip.onclick=downloadSupportingEvidenceZip;
}
async function downloadSupportingEvidenceZip(){const items=supportingMeta().filter(x=>x.course===course);if(!items.length){alert("There is no supporting evidence to download yet.");return}if(!window.eviaSupportingFileGet){alert("Supporting evidence storage is unavailable.");return}const files=[],used=new Set();for(const item of items){const rec=await window.eviaSupportingFileGet(item.id);if(!rec||!rec.blob)continue;let filename=item.filename||supportingSlug(item.title)+".bin",path=filename,n=2;while(used.has(path)){const dot=filename.lastIndexOf("."),name=dot>0?filename.slice(0,dot):filename,ext=dot>0?filename.slice(dot):"";path=name+"-"+n+ext;n++}used.add(path);files.push({path,blob:rec.blob})}if(!files.length){alert("The supporting evidence files could not be loaded.");return}const zip=await makeStoredZip(files),a=document.createElement("a");a.href=URL.createObjectURL(zip);a.download="Supporting-Evidence.zip";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),2000)}
async function makeStoredZip(files){const enc=new TextEncoder(),chunks=[],central=[];let offset=0;const crcTable=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xedb88320^(c>>>1)):(c>>>1);t[n]=c>>>0}return t})();const crc32=bytes=>{let c=0xffffffff;for(const b of bytes)c=crcTable[(c^b)&255]^(c>>>8);return(c^0xffffffff)>>>0};const u16=n=>new Uint8Array([n&255,(n>>>8)&255]),u32=n=>new Uint8Array([n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255]),concat=arr=>{const len=arr.reduce((n,x)=>n+x.length,0),out=new Uint8Array(len);let p=0;arr.forEach(x=>{out.set(x,p);p+=x.length});return out};const dos=()=>{const d=new Date(),time=(d.getHours()<<11)|(d.getMinutes()<<5)|Math.floor(d.getSeconds()/2),date=((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate();return{time,date}};for(const f of files){const name=enc.encode(f.path),bytes=new Uint8Array(await f.blob.arrayBuffer()),crc=crc32(bytes),d=dos(),local=concat([u32(0x04034b50),u16(20),u16(0x800),u16(0),u16(d.time),u16(d.date),u32(crc),u32(bytes.length),u32(bytes.length),u16(name.length),u16(0),name]);chunks.push(local,bytes);central.push({name,crc,size:bytes.length,offset,time:d.time,date:d.date});offset+=local.length+bytes.length}const cd=concat(central.map(f=>concat([u32(0x02014b50),u16(20),u16(20),u16(0x800),u16(0),u16(f.time),u16(f.date),u32(f.crc),u32(f.size),u32(f.size),u16(f.name.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(f.offset),f.name]))),end=concat([u32(0x06054b50),u16(0),u16(0),u16(central.length),u16(central.length),u32(cd.length),u32(offset),u16(0)]);return new Blob([...chunks,cd,end],{type:"application/zip"})}

function unitStrengthForCourse(unitName){
 if(window.eviaStrength)return window.eviaStrength.unit(unitName);
 const es=evidence.filter(e=>e.c===course&&e.u===unitName);
 if(!es.length)return null;
 const photos=es.reduce((n,e)=>n+(Array.isArray(e.photoIds)?e.photoIds.length:(Array.isArray(e.p)?e.p.length:0)),0);
 const words=es.reduce((n,e)=>n+String(e.w||"").trim().split(/\s+/).filter(Boolean).length,0);
 const photoLevel=photos<=4?"weak":photos<=9?"good":"strong";
 const textLevel=words<=49?"weak":words<=99?"good":"strong";
 return photoLevel==="strong"&&textLevel==="strong"?"strong":photoLevel==="weak"||textLevel==="weak"?"weak":"good";
}
function strengthBars(level){
 const n=level==="strong"?3:level==="good"?2:level==="weak"?1:0;
 return '<span class="unit-strength-bars" aria-label="'+(level?esc(level):"No evidence")+'">'+[0,1,2].map(i=>'<i class="signal-bar signal-bar-'+(i+1)+(i<n?" filled":"")+'"></i>').join("")+'</span>';
}
/* A pack that's been started (photos or a write-up) but not submitted yet. */
function isDraft(unitName){try{const p=JSON.parse(localStorage.getItem("evia7-working-evidence-packs")||"{}")[course+"|"+unitName];return !!p&&((p.photos||[]).length>0||String(p.write||"").trim().length>0)}catch(_){return false}}
const draftChip=unitName=>isDraft(unitName)?'<span class="draft-chip">Draft</span>':"";
function courses(){
 if(window.eviaNvq&&window.eviaNvq.on())return window.eviaNvq.courseScreen();
 $("#page-title").textContent="Course";
 $("#screen").innerHTML='<div class="card"><div class="section-title">'+esc(data().std)+'</div><h2>'+esc(data().name)+'</h2><p>'+data().u.length+' units. Open a unit to capture evidence.</p></div>'+data().u.map((u,i)=>{
   const level=unitStrengthForCourse(u[0]);
   return '<div class="card unit-card" data-u="'+i+'"><div class="unit-title">'+esc(u[0])+draftChip(u[0])+'</div>'+strengthBars(level)+'</div>';
 }).join("")+'<div class="card unit-card supporting-course-card" data-supporting-evidence><div class="unit-title">Supporting Evidence</div><small>Witness testimony, photos, videos and files</small><span class="supporting-course-arrow">›</span></div>';
 document.querySelectorAll("[data-u]").forEach(b=>b.onclick=()=>openUnit(+b.dataset.u));const supportingCard=document.querySelector("[data-supporting-evidence]");if(supportingCard)supportingCard.onclick=()=>openSupportingEvidence();
}
/* Every KSB on the course with the standard's own wording (ksb-official.js); a unit's shorter wording only if the
   standard's isn't there. */
function officialKsb(c){return ((window.EVIA_KSB_OFFICIAL||{})[course]||{})[c]||""}
function allK(){if(window.eviaNvq&&window.eviaNvq.on())return window.eviaNvq.allK();let m=new Map();data().u.forEach(u=>u[1].forEach(k=>{const c=code(k);if(!m.has(c))m.set(c,officialKsb(c)||text(k))}));
 /* The whole standard, including any KSB no unit covers (it can still be added to evidence that shows it). */
 Object.entries((window.EVIA_KSB_OFFICIAL||{})[course]||{}).forEach(([c,t])=>{if(!m.has(c))m.set(c,t)});return [...m].sort((a,b)=>a[0][0].localeCompare(b[0][0])||Number(a[0].slice(1))-Number(b[0].slice(1)))}
function courseProgressMeta(){
 const metas={
  bricklayer:{durationMonths:24,epaMonths:3},
  site:{durationMonths:24,epaMonths:6},
  joiner:{durationMonths:24,epaMonths:6},
  trowel3:{durationMonths:18,epaMonths:0}
 };
 return metas[course]||metas.bricklayer;
}
function ksbDetail(codeValue,wording,mapped,onClose){
 const so=ksbSignoff(),signed=so.on?so.signed.has(codeValue):mapped;
 const mappedEntries=evidence.filter(e=>e.c===course&&Array.isArray(e.k)&&e.k.includes(codeValue));
 const units=[...new Set(mappedEntries.map(e=>e.u))];
 const supporting=supportingMeta().filter(x=>x.course===course&&Array.isArray(x.ksbs)&&x.ksbs.includes(codeValue));
 const evidenceHtml=mappedEntries.length
   ? mappedEntries.map(e=>'<div class="ksb-evidence-item"><strong>'+esc(e.u)+'</strong><span>'+esc(e.d||(e.savedAt?formatDateTime(e.savedAt):"Saved evidence"))+'</span></div>').join("")
   : '<p class="ksb-empty">No saved course evidence is currently mapped to this KSB.</p>';
 const supportingHtml=supporting.length?'<div class="ksb-modal-section"><div class="section-title">Supporting evidence</div>'+supporting.map(x=>'<div class="ksb-evidence-item"><strong>'+esc(x.title)+'</strong><span>'+esc(x.behaviourTitle)+' · '+esc(supportingTypeLabel(x.type))+'</span></div>').join("")+'</div>':"";
 document.getElementById("modal-root").innerHTML=
   '<div class="ksb-modal-overlay"><section class="ksb-modal">'+
   '<div class="ksb-modal-head"><div><div class="code">'+esc({K:"Knowledge",S:"Skill",B:"Behaviour"}[String(codeValue).charAt(0)]||"KSB")+'</div><h2>'+esc(codeValue)+'</h2></div><button class="close" id="ksb-close" aria-label="Close">×</button></div>'+
   '<div class="ksb-modal-section"><div class="section-title">KSB wording</div><p>'+esc(wording)+'</p></div>'+
   '<div class="ksb-modal-section"><div class="section-title">Evidence mapped</div>'+evidenceHtml+'</div>'+
   supportingHtml+
   '<div class="ksb-modal-foot">'+(signed?'<span class="ksb-met">✓ '+(so.on?"Signed off by your assessor":"Evidence captured")+'</span>':so.on&&(mappedEntries.length||supporting.length)?'<span class="ksb-maybe">◐ Evidence added, waiting for your assessor to sign it off</span>':'<span class="ksb-not-met">Not yet captured</span>')+(supporting.length?'<span class="ksb-supporting-status">○ Supporting evidence attached</span>':"")+(units.length?'<span>'+units.length+' unit'+(units.length===1?"":"s")+" mapped</span>":"")+'</div>'+
   (signed||moreRequired().some(x=>x.code===codeValue)?(signed?"":'<div class="ksb-aim-row"><strong class="ksb-maybe">More required</strong><small>Your assessor needs more evidence for this. Anything that shows it counts: a couple of photos and a short write-up, just photos, or just a write-up.</small></div>'):'<div class="ksb-aim-row"><button type="button" class="'+(ksbAims().includes(codeValue)?"secondary":"primary")+'" id="ksb-aim">'+(ksbAims().includes(codeValue)?"Stop aiming for "+esc(codeValue):"Aim for "+esc(codeValue))+'</button><small>Evia shows you the jobs that cover it, and you can add it to any evidence pack that shows it.</small></div>')+
   '</section></div>';
 const close=()=>{document.getElementById("modal-root").innerHTML="";if(onClose)onClose()};
 document.getElementById("ksb-close").onclick=close;
 const aim=document.getElementById("ksb-aim");if(aim)aim.onclick=()=>{setKsbAim(codeValue,!ksbAims().includes(codeValue));close()};
}
function openSavedReviews(){
 const reviews=window.eviaGetReviews?window.eviaGetReviews():[];
 $("#page-title").textContent="Reviews";
 $("#screen").innerHTML='<button class="secondary" id="back-reviews-portfolio" type="button">‹ My course</button><div class="card portfolio-intro"><div class="section-title">PORTFOLIO</div><h2>Saved Reviews</h2><p>All progress reviews saved for this course.</p></div>'+
 (reviews.length?'<div class="saved-reviews-list">'+reviews.map((r,i)=>'<button type="button" class="card saved-review-item" data-review-id="'+esc(r.id||"")+'"><div><strong>Progress Review</strong><span>'+esc(new Date(r.date).toLocaleDateString("en-GB"))+'</span></div><b>›</b></button>').join("")+'</div>':'<div class="card"><p>No saved reviews yet.</p></div>');
 $("#back-reviews-portfolio").onclick=()=>nav("course");
 document.querySelectorAll("[data-review-id]").forEach(b=>b.onclick=()=>{
   const id=b.getAttribute("data-review-id");
   if(window.eviaShowReview)window.eviaShowReview(id);
 });
}function confidenceHistory(){return window.eviaData.list("confidence")}
function confidenceQuestions(){
 const banks={
  bricklayer:[
   ["Jointing styles","How confident are you at choosing and producing the correct joint finish, including flush, recessed, half-round and weather-struck joints?"],
   ["Mortar mixing","How confident are you at selecting the correct mortar materials and mixing to the required ratio and consistency?"],
   ["Setting out a solid wall","How confident are you at setting out a solid brick wall accurately from drawings, including gauge, line, corners and capping?"],
   ["Brick bonds","How confident are you at setting out and building English bond, Flemish bond, garden wall bonds and broken bond?"],
   ["Materials","How confident are you at selecting the correct bricks, blocks, mortar, wall ties, DPCs, cavity trays and lintels for a job?"],
   ["Cavity wall setting out","How confident are you at setting out a cavity wall with openings, profiles, gauge rods, DPCs, cavity trays and weep holes?"],
   ["Cavity wall construction","How confident are you at constructing a stretcher-bond cavity wall with a return and opening, including insulation and fire stopping?"],
   ["Lintels","How confident are you at selecting and correctly positioning a lintel and forming the surrounding opening, including the required cavity details?"],
   ["Joint protection","How confident are you at protecting unfinished and completed brickwork from frost, water and construction damage?"],
   ["Raking cuts","How confident are you at setting out and constructing a gable end or other raked brick wall accurately?"],
   ["Cutting bricks","How confident are you at measuring and cutting bricks and blocks safely to the required tolerance?"],
   ["Brick repairs","How confident are you at identifying a damaged brick and carrying out a simple repair without damaging the surrounding wall?"]
  ],
  site:[
   ["Structural carcassing","How confident are you at setting out and installing load-bearing timber studwork accurately?"],
   ["Partition walls","How confident are you at setting out and constructing straight timber or metal partition walls?"],
   ["Floor joists","How confident are you at setting out and installing floor joists and their coverings correctly?"],
   ["Stairs","How confident are you at setting out and installing a straight flight of stairs accurately?"],
   ["Service encasement","How confident are you at constructing service encasements safely and accurately?"],
   ["Cladding","How confident are you at setting out and installing timber cladding correctly?"],
   ["Units and fitments","How confident are you at manufacturing or fitting wall and floor units and producing accurate jigs where required?"],
   ["Handrails and spindles","How confident are you at setting out and fitting handrails and spindles to a straight flight of stairs?"],
   ["Doors","How confident are you at fitting internal and external doors accurately, including the required connections and ironmongery?"],
   ["Skirting and architrave","How confident are you at measuring, cutting, scribing and fitting skirting boards and architrave?"],
   ["Window boards","How confident are you at measuring, marking out, cutting, mitring and fitting window boards?"],
   ["Roofs","How confident are you at constructing rafter roofs, including verge, eaves and loft access details?"]
  ],
  joiner:[
   ["Woodworking joints","How confident are you at producing accurate dovetail, bridal, mortise and tenon and halving joints?"],
   ["Timber windows","How confident are you at manufacturing and assembling a timber window with casement, glazing rebates and ironmongery?"],
   ["Straight staircases","How confident are you at manufacturing and assembling a straight timber staircase accurately?"],
   ["Door frames and linings","How confident are you at manufacturing and assembling timber door frames and linings?"],
   ["Timber doors","How confident are you at manufacturing and assembling timber doors accurately?"],
   ["Wall and floor units","How confident are you at manufacturing and assembling wall and floor units and fitments?"],
   ["Staircase spindles","How confident are you at manufacturing and assembling staircase spindles and balustrades?"],
   ["Ironmongery","How confident are you at accurately fitting locks, handles, hinges, latches and drawer runners?"],
   ["Fixed machinery","How confident are you at inspecting, preparing and safely operating fixed woodworking machinery?"],
   ["Materials","How confident are you at selecting timber and timber-based products for the job and recognising their characteristics?"],
   ["Drawings","How confident are you at interpreting drawings and specifications and extracting the information you need to manufacture a component?"],
   ["Power tools","How confident are you at selecting, using, inspecting and storing the correct power tools for the job?"]
  ],
  trowel3:[
   ["Setting out","How confident are you at setting out masonry structures, including datums, right angles, curves and levels on sloping ground?"],
   ["Arches","How confident are you at setting out and building arches, including the centre, springing line and voussoirs?"],
   ["Chimneys and fireplaces","How confident are you at building a chimney stack or fireplace, including flue liners, DPCs and hearths?"],
   ["Decorative work","How confident are you at building flush, projecting and decorative features such as corbels, plinths and string courses?"],
   ["Curved and splayed walls","How confident are you at building walls curved on plan or in elevation, and walls splayed on plan?"],
   ["Masonry cladding","How confident are you at cladding timber frame, steel or concrete structures, including ties, cavity trays and fire barriers?"],
   ["Masonry structures","How confident are you at building cavity and solid walls with openings, cills, copings and joint finishes?"],
   ["Repairs","How confident are you at repairing and maintaining existing masonry, matching materials and bond?"],
   ["Drawings and information","How confident are you at interpreting drawings, specifications, schedules and method statements for a job?"],
   ["Planning work","How confident are you at planning the sequence of work, estimating resources and keeping to a programme?"],
   ["Methods of work","How confident are you at choosing and confirming the best method of work for a job?"],
   ["Working relationships","How confident are you at communicating with your team, other trades and customers, and sorting out disagreements?"]
  ]
 };
 return banks[course]||banks.bricklayer;
}

function chat(){
 const profileBtn=$("#profile-btn");
 if(profileBtn)profileBtn.style.display="none";
 const fab=$("#evia-fab");
 fab.classList.add("chat-active");
 $("#modal-root").innerHTML='<div class="overlay"><section class="sheet chat-sheet"><div class="sheet-head"><div><div class="chat-kicker">EVIA</div><h2>What would you like to do?</h2></div><button class="close" id="x" aria-label="Close">×</button></div><div class="chat" id="chat"></div></section></div>'; /* ui.js fills the chat */
 $("#x").onclick=()=>{ $("#modal-root").innerHTML=""; fab.classList.remove("chat-active"); const profileBtn=$("#profile-btn"); if(profileBtn && ["learning","course","progress","portfolio","teach","rewards"].includes(screen))profileBtn.style.display="flex"; };
 const scroll=()=>{const c=$("#chat");if(c)c.scrollTop=c.scrollHeight};
 /* Evia's messages "think" one at a time, so several added together still arrive in order. */
 let thoughtChainEnd=0;
 const chatObserver=new MutationObserver(mutations=>{mutations.forEach(m=>m.addedNodes.forEach(node=>{if(!(node instanceof HTMLElement))return;const list=[];if(node.matches&&node.matches(".bubble.evia"))list.push(node);if(node.querySelectorAll)list.push(...node.querySelectorAll(".bubble.evia"));list.forEach(el=>{if(el.classList.contains("evia-thinking")||el.dataset.thoughtComplete==="1"||el.dataset.thoughtQueued==="1")return;el.dataset.thoughtQueued="1";const html=el.innerHTML;el.className="bubble evia evia-thinking";el.innerHTML='<span class="thinking-label">Evia is thinking</span><span class="thinking-dots"><i></i><i></i><i></i></span>';scroll();const now=Date.now(),revealAt=Math.max(now,thoughtChainEnd)+1200;thoughtChainEnd=revealAt;setTimeout(()=>{el.className="bubble evia";el.dataset.thoughtComplete="1";el.innerHTML=html;scroll()},revealAt-now);});}));});chatObserver.observe($("#chat"),{childList:true,subtree:true});
}
document.querySelectorAll("[data-nav]").forEach(b=>b.onclick=()=>nav(b.dataset.nav));
$("#evia-fab").onclick=chat;
render();


// Keep the fixed navigation out of the way of the on-screen keyboard on touch devices.
(function(){
  if(!window.matchMedia || !window.matchMedia("(hover: none) and (pointer: coarse)").matches)return;
  const update=()=>document.body.classList.toggle("evia-keyboard-editing",!!document.activeElement&&/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName));
  document.addEventListener("focusin",update);
  document.addEventListener("focusout",()=>setTimeout(update,120));
})();
