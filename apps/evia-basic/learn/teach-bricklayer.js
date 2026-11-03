/* Teach me: Bricklayer (ST0095). Lessons for every unit that between them cover the unit's KSBs.
   Mixing mortar is the first unit in the new style: short lessons where Evia teaches a bit, you try it, get
   feedback, learn something new, try again, then a quick challenge and a second go at anything you missed. It ends
   with a unit challenge. Every other unit follows the same pattern: two lessons and a unit challenge. */
(function(){
  const {L,TE,EX,W,CD,Q,T,M,O,G,B,TAP,S,J,SP,N,SC,HOT,LB,LD,QF,TROPHY,lesson,unit,add}=window.EVIA_TEACH;
  const bk=k=>({key:k,label:k[0].toUpperCase()+k.slice(1),pic:"bucket-"+k});
  const CHALLENGE={t:"banner",kind:"challenge",title:"Quick challenge",text:"A couple of harder ones to finish. Show what you’ve got!"};
  /* Mixing mortar: S14, K20 (ratios, silos, pre-mixed, gauging, hand and machine mixing), S1 and K1 (safety signs),
     S6 and K12 (how much to mix), S20 (teamwork) and B1 (health, safety and wellbeing first). */
  add("bricklayer",[{unit:"Mixing mortar",skill:"Mortar mixing",lessons:[
    /* 1: explore first, then build up ratios by doing. */
    {id:"mm1",title:"What’s in mortar",blurb:"The ingredients, and what a ratio means",
      surprise:{t:"choice",q:"You’ve tipped 3 buckets of cement onto the board for a 1:4 mix. How many buckets of sand go with them?",opts:["12","7","4","3"],a:0,why:"4 of sand for every 1 of cement: 3 × 4 = 12."},
      steps:[
      {t:"explore",title:"Meet the mix",pic:"ingredients",say:"Mortar bonds the bricks together, spreads the load evenly and keeps the weather out. Tap each ingredient.",spots:[
        {x:54,y:80,label:"Sand",text:"*Building sand* (soft sand) gives mortar its body. It’s most of the mix."},
        {x:158,y:46,label:"Cement",text:"Cement is the *binder*. Mixed with water it sets hard and holds everything together."},
        {x:205,y:82,label:"Water",text:"Clean water starts the cement setting and makes the mix workable."},
        {x:272,y:90,label:"Plasticiser",text:"A *plasticiser* makes mortar smoother and easier to spread. Some mixes use lime for this instead."}]},
      {t:"match",q:"Match each ingredient to its job",pairs:[["Sand","Gives the mix its body"],["Cement","Binds it as it sets"],["Water","Starts the set"],["Plasticiser","Makes it easier to spread"]],why:"Sand for body, cement to bind, water to start the set, plasticiser to help it spread."},
      {t:"teach",key:"Ratio",title:"Mixed by ratio",pic:"ratio",say:"Mortar is mixed by *ratio*, by volume. 1:4 means 1 part cement to 4 parts sand, using the same bucket for every part."},
      {t:"load",q:"Load a *1:3* mix onto the board",into:"Mixing board",items:[bk("cement"),bk("sand")],need:{cement:1,sand:3},hint:"1:3 is 1 bucket of cement and 3 of sand.",why:"1 part cement to 3 parts sand. The first number is the cement.",
        again:{t:"gap",text:"1:3 means 1 bucket of [cement] to 3 buckets of [sand].",opts:["water","lime"],why:"The first number is the cement, the second the sand."}},
      {t:"teach",title:"Three-part mixes",pic:"ratio3",say:"Some specifications add lime as a third part. *1:1:6* means 1 cement, 1 lime and 6 sand. The order is always cement, lime, sand."},
      {t:"tap",q:"The spec says 1:1:6. Tap the number for the lime.",text:"1 : {1} : 6",hint:"It goes cement, then lime, then sand.",why:"Cement : lime : sand, so the middle number is the lime.",
        again:{t:"tf",q:"In a 1:1:6 mix, the 6 is the lime.",a:false,why:"It goes cement, lime, sand, so the 6 is the sand."}},
      {t:"teach",title:"Stronger isn’t better",pic:"cracks",say:"Mortar should be a bit weaker than the bricks. Then if the wall moves, cracks follow the joints, which can be raked out and repointed, instead of splitting the bricks."},
      {t:"tf",q:"The strongest mix is always the best choice.",a:false,why:"Too strong and the bricks crack instead of the joints. The specification sets the right mix for the job.",
        again:{t:"choice",q:"Why should mortar be a bit weaker than the bricks?",opts:["So any cracks follow the joints, which are easy to repoint","So it’s cheaper","So it sets faster","So it’s easier to mix"],a:0,why:"Weaker mortar means movement cracks stay in the joints, not the bricks."}},
      {t:"scene",who:"Your supervisor",say:"Can you get some mortar mixed for the garden wall?",q:"Nobody’s told you the mix. What do you do?",opts:[
        {text:"Check the specification, or ask what mix it needs",ok:true,why:"The spec sets the mix for the job. If you’re not sure, ask."},
        {text:"Make it 1:3 to be safe, as stronger is better",ok:false,why:"Stronger isn’t safer. Too strong and the bricks can crack. The spec sets the mix."},
        {text:"Use whatever you mixed on the last job",ok:false,why:"Every job can be different. Check the spec, or ask."}]}
    ]},
    /* 2: starts with a problem on site, then teaches why it happened. */
    {id:"mm2",title:"Gauging it right",blurb:"Why Priya’s wall came out patchy",
      surprise:{t:"tf",q:"Two batches mixed at the same ratio, but with sand from different deliveries, can dry a different colour.",a:true,why:"Sand colour varies between deliveries, so use the same sand for the whole job where you can."},
      steps:[
      {t:"scene",who:"Priya, second year",pic:"banding",say:"My wall’s come out patchy: some joints are darker than others. I just counted shovels for each batch.",q:"What do you think went wrong?",opts:[
        {text:"Shovelfuls vary, so each batch had a different mix",ok:true,why:"Spot on. Every shovelful is a different size, so the strength and colour of each batch drifts."},
        {text:"The bricks were too wet",ok:false,why:"Wet bricks cause other problems, but patchy joints batch by batch come from the mix changing."},
        {text:"Nothing: joints always dry patchy",ok:false,why:"They shouldn’t. Joints dry an even colour when every batch is the same."}]},
      {t:"teach",key:"Gauging",title:"Gauge every part",pic:"strike",say:"*Gauging* means measuring every part the same way, every time. Fill the bucket or gauge box, then strike it off level with a straight edge."},
      {t:"choice",q:"Which bucket is gauged properly?",opts:[{pic:"heaped"},{pic:"level"},{pic:"under"}],a:1,why:"Struck off level holds the same amount every time. Heaped holds more, and short holds less.",
        again:{t:"tf",q:"A heaped bucket holds the same as one struck off level.",a:false,why:"A heaped bucket holds more, so the mix changes."}},
      {t:"judge",q:"Good gauging, or bad?",items:[
        {text:"Using the same bucket for the cement and the sand",good:true,why:"Same bucket, same size parts."},
        {text:"Heaping the bucket to save a trip",good:false,why:"A heaped bucket holds more, so the mix changes."},
        {text:"Striking off each bucket level",good:true,why:"Level every time means the same amount every time."},
        {text:"Adding an extra bit of cement for luck",good:false,why:"It changes the strength and the colour."}]},
      {t:"teach",title:"Watch the sand",pic:"sandcover",say:"Sand left in the rain soaks up water. Wet sand already holds some, so add yours a little at a time. Keep sand covered, and use the same delivery for the whole job so the colour matches."},
      {t:"spot",q:"Jay mixed three batches for one wall. Tap the mistake.",lines:["Batch 1: 1 bucket of cement to 4 of sand, all struck off level","Batch 2: the same bucket, struck off level again","Batch 3: soaking wet sand, and the usual water tipped in all at once","Each batch: turned until it was one even colour"],a:2,why:"With wet sand, water should go in a little at a time. Batch 3 will be sloppy and weaker than the rest."},
      {t:"quick",items:[
        {q:"Gauging keeps the colour the same from batch to batch",a:true},
        {q:"A gauge box is struck off level",a:true},
        {q:"Soaking wet sand needs extra water",a:false},
        {q:"Covering the sand keeps batches the same",a:true}]}
    ]},
    /* 3: hands on: watch it, then do it. */
    {id:"mm3",title:"Mixing by hand",blurb:"Dry mix, make a well, add water, turn",
      surprise:{t:"tf",q:"Washing-up liquid is a good swap for plasticiser.",a:false,why:"It isn’t made for mortar and can put too much air in, which weakens it. Use a proper plasticiser at the dose on the tub."},
      steps:[
      {t:"watch",title:"Mixing by hand",frames:[
        {pic:"hand1",text:"Gauge the sand and cement onto a clean mixing board."},
        {pic:"hand2",text:"Turn it over dry until it’s one even colour, with no streaks."},
        {pic:"hand3",text:"Make a well in the middle and pour in some water, with the plasticiser mixed in if you’re using it."},
        {pic:"hand4",text:"Turn the dry mix in from the edges, adding water a little at a time, until it’s smooth and workable."}]},
      {t:"order",q:"Your turn: put the steps in order",items:["Gauge the sand and cement","Dry mix to one even colour","Make a well in the middle","Add water a little at a time","Turn it until it’s smooth and workable"],why:"Dry mixing first spreads the cement evenly before any water goes in.",
        again:{t:"next",seq:["Dry mix to one even colour","Make a well in the middle","Pour some water into the well"],opts:["Turn the dry mix in from the edges","Leave it to soak for an hour","Tip the water off and start again"],a:0,why:"Turn it in from the edges, adding water a little at a time."}},
      {t:"teach",key:"Workable",title:"What good mortar looks like",pic:"consistency",say:"Good mortar is *workable*: one even colour, holds its shape on the trowel and spreads smoothly. Too wet, it slumps and runs. Too dry, it crumbles and won’t stick."},
      {t:"sort",q:"Too wet, just right or too dry?",bins:["Too wet","Just right","Too dry"],items:[
        {text:"Slumps and runs off the trowel",bin:0,why:"Too much water."},
        {text:"Crumbles and won’t stick to the brick",bin:2,why:"Not enough water to bind it."},
        {text:"Holds its shape and spreads smoothly",bin:1,why:"That’s workable mortar."},
        {text:"Stiff and hard to spread",bin:2,why:"It needs a little more water."},
        {text:"Squeezes out and smears the face of the bricks",bin:0,why:"Sloppy mortar oozes out of the joints and stains the face."}]},
      {t:"teach",title:"Use it in time",pic:"clock2h",say:"Only mix what you’ll use in about two hours. Once mortar starts to set, adding water just weakens it, so throw it away and mix fresh."},
      {t:"scene",who:"On site",say:"The mortar in your tub was mixed nearly three hours ago and it’s stiffening up.",q:"What now?",opts:[
        {text:"Throw it away and mix a fresh batch",ok:true,why:"Once it’s started to set it won’t bond properly. Next time, mix less, more often."},
        {text:"Add water and knock it back up",ok:false,why:"Adding water to mortar that’s setting weakens it."},
        {text:"Add some cement to bring it back",ok:false,why:"That won’t bring it back, and it changes the mix."}]},
      {t:"choice",q:"Last one: which trowel of mortar is just right?",opts:[{pic:"trowel-wet"},{pic:"trowel-good"},{pic:"trowel-dry"}],a:1,why:"It holds a neat shape with an even colour: not runny, not crumbly.",
        again:{t:"tf",q:"Mortar that slumps flat and drips off the trowel is too wet.",a:true,why:"Too much water: it’ll squeeze out and stain the face."}}
    ]},
    /* 4: kit and machines, with a quick challenge at the end. */
    {id:"mm4",title:"Mixers, silos and pre-mix",blurb:"Machine mixing and ready-made mortar",
      surprise:{t:"choice",q:"What colour are the plugs and leads for 110 V site equipment?",opts:["Yellow","Blue","Red","Black"],a:0,why:"Yellow is 110 V. Blue is 230 V and red is 400 V."},
      steps:[
      {t:"explore",title:"The drum mixer",pic:"mixer",say:"For bigger batches you’ll use a drum mixer. Only use one if you’ve been shown how. Tap each part.",spots:[
        {x:196,y:50,label:"Drum",text:"Turns to mix the mortar. Tip each shovelful in at the mouth. Never put your hands, a shovel or a tool inside while it’s turning."},
        {x:104,y:92,label:"Tipping wheel",text:"Tilts the drum to empty the mortar into a barrow."},
        {x:170,y:98,label:"Motor",text:"Electric or petrol. Keep the guards on, and switch off before you clean or fix anything."},
        {x:150,y:141,label:"Stand",text:"Set it up level and stable on firm ground, out of the way of walkways."},
        {x:264,y:153,label:"110 V plug",text:"Electric tools and mixers on site usually run on 110 V, with yellow plugs and leads. Check the lead isn’t damaged."}]},
      {t:"teach",title:"Loading the mixer",pic:"mixload",say:"With the drum turning: some water first, then half the sand, the cement, the rest of the sand, then top up the water slowly. Let it mix for a few minutes."},
      {t:"order",q:"Load the mixer in the right order",items:["Some of the water","Half the sand","The cement","The rest of the sand","Top up the water slowly"],why:"Water first stops the mix sticking to the drum, and the cement goes in between the sand so it mixes in evenly.",
        again:{t:"choice",q:"Why does some water go in the drum first?",opts:["It stops the mix sticking to the drum","It makes the mortar stronger","It cools the motor","It measures the sand"],a:0,why:"A wet drum stops the sand and cement sticking and balling up."}},
      {t:"hot",q:"Tap where you must never put your hands while it’s turning",pic:"mixer",a:0,spots:[
        {x:196,y:50,r:34,label:"Drum"},{x:104,y:92,r:17,label:"Tipping wheel",why:"You turn that wheel to tip the drum. Look for the part that mixes."},{x:170,y:98,r:12,label:"Motor"},{x:150,y:141,r:16,label:"Stand"},{x:264,y:153,r:14,label:"Plug"}],
        why:"The drum. Keep hands, gloves and tools out. Switch off and wait for it to stop before you clean it.",
        again:{t:"tf",q:"It’s fine to reach into the drum if it’s only turning slowly.",a:false,why:"Never. Switch off and wait for it to stop."}},
      {t:"explore",title:"Silo mortar",pic:"silo",say:"Big sites often have a silo. The mix is set at the factory, so every batch comes out the same. Tap to see how it works.",spots:[
        {x:114,y:88,label:"Silo",text:"Holds dry mortar, already blended at the factory: sand, cement and any additives."},
        {x:152,y:139,label:"Mixer",text:"At the bottom, water is added and it’s mixed as it comes through."},
        {x:161,y:113,label:"Controls",text:"Start it, and stop when you’ve got enough. Only use it if you’ve been shown how."},
        {x:256,y:125,label:"Water supply",text:"A hose brings the water in at a set flow, so the mix stays the same."},
        {x:197,y:154,label:"Outlet",text:"Mixed mortar comes out here, into a barrow or tub."}]},
      {t:"teach",key:"Retarder",title:"Pre-mixed mortar",pic:"premix",say:"Ready-to-use mortar arrives wet in tubs. A *retarder* keeps it workable for a set time, often a day or two, so check the delivery ticket. Keep the lid on so it doesn’t dry out or get rained on."},
      CHALLENGE,
      {t:"label",q:"Label the silo",pic:"silo",spots:[
        {x:40,y:40,px:84,py:44,label:"Dry mortar"},{x:40,y:112,px:106,py:138,label:"Mixer"},{x:212,y:40,px:163,py:106,label:"Controls"},
        {x:276,y:80,px:283,py:126,label:"Water supply"},{x:262,y:152,px:203,py:152,label:"Outlet"}],
        why:"Dry mortar in the silo, water from the supply, mixed at the bottom, and out through the outlet."},
      {t:"scene",who:"Your labourer",say:"The silo mortar’s coming out much wetter than usual today.",q:"What’s the best thing to do?",opts:[
        {text:"Stop and tell your supervisor so it can be checked",ok:true,why:"Only someone trained should change the water setting. Reporting it keeps every batch right."},
        {text:"Use it anyway, as it’ll dry out on the wall",ok:false,why:"Wet mortar is weaker, slumps in the joints and stains the face."},
        {text:"Tip a bag of cement into the barrow to thicken it",ok:false,why:"That changes the mix. The silo’s mix is set at the factory."}]}
    ]},
    /* 5: opens with an emergency, then PPE, signs, quantities and the team. */
    {id:"mm5",title:"Safe, sorted and together",blurb:"PPE, signs, how much to mix, teamwork",
      surprise:{t:"choice",q:"Which sign tells you to wear eye protection?",opts:[{pic:"sign-eyewash"},{pic:"sign-eyes"},{pic:"sign-warn"}],a:1,why:"A blue circle is a must-do sign: wear eye protection. The green one shows where the eyewash is."},
      steps:[
      {t:"scene",who:"Kai, your labourer",say:"Argh, mortar’s just splashed in my eye!",q:"What do you do first?",opts:[
        {text:"Rinse it with clean water straight away, for at least 10 minutes, and get first aid",ok:true,why:"Use an eyewash or clean water for at least 10 minutes, then get first aid or medical help."},
        {text:"Tell Kai to rub it until it stops stinging",ok:false,why:"Rubbing grinds the grit in. Rinse it out."},
        {text:"Wait and see if it settles down",ok:false,why:"Cement can damage an eye quickly. Rinse it straight away."}]},
      {t:"explore",title:"Kit up to mix",pic:"ppe-close",say:"Wet cement is strongly alkaline. It can burn skin, sometimes without you feeling it until hours later. Tap to see what protects you.",spots:[
        {x:145,y:46,label:"Goggles",text:"Cement splashes and dust can seriously damage your eyes."},
        {x:174,y:66,label:"Dust mask",text:"For opening and tipping cement bags, which throws up fine dust."},
        {x:121,y:137,label:"Gloves",text:"Waterproof gloves keep wet cement off your hands. Don’t let it get inside them."},
        {x:160,y:92,label:"Long sleeves",text:"Keep your arms and legs covered, with hi-vis on top so you’re seen."},
        {x:147,y:193,label:"Boots",text:"Safety boots. Wet mortar inside a boot, or soaking through at the knees, can burn."}]},
      {t:"cards",title:"Safety signs: tap each one to flip it",cards:[
        {pic:"sign-eyes",term:"Blue circle: must do",back:"A *mandatory* sign. This one says wear eye protection."},
        {pic:"sign-nosmoke",term:"Red ring and bar: must not",back:"A *prohibition* sign. This one says no smoking."},
        {pic:"sign-warn",term:"Yellow triangle: warning",back:"A *warning* sign: there’s a hazard. This one is general danger."},
        {pic:"sign-firstaid",term:"Green square: safe condition",back:"Shows safety equipment or the way out. This one is first aid."},
        {pic:"sign-extinguisher",term:"Red square: fire equipment",back:"Shows where fire-fighting kit is. This one is a fire extinguisher."}]},
      {t:"sort",q:"New signs: what kind is each one?",bins:["Must do","Must not","Warning","Safe condition","Fire equipment"],items:[
        {pic:"sign-hat",bin:0,why:"Blue circle: wear a hard hat."},
        {pic:"sign-nophone",bin:1,why:"Red ring and bar: no mobile phones."},
        {pic:"sign-electric",bin:2,why:"Yellow triangle: danger, electricity."},
        {pic:"sign-eyewash",bin:3,why:"Green square: eyewash station."},
        {pic:"sign-gloves",bin:0,why:"Blue circle: wear gloves."}]},
      {t:"teach",title:"How much to mix",pic:"wall-est",say:"Work out what you’ll lay before the mortar starts to set, and mix just that. A half-brick wall takes about *60 bricks* a square metre."},
      {t:"gap",q:"Work it out",text:"A half-brick wall 5 m long and 1.2 m high is 6 m². At 60 bricks a square metre, that’s about [360] bricks.",opts:["300","72","600"],why:"5 × 1.2 = 6 m², and 6 × 60 = 360 bricks.",
        again:{t:"choice",q:"A half-brick wall is 3 m long and 1.5 m high. About how many bricks?",opts:["270","180","450","90"],a:0,why:"3 × 1.5 = 4.5 m², and 4.5 × 60 = 270 bricks."}},
      {t:"teach",title:"Mortar runs the job",pic:"team",say:"Tell your labourer what you’ll need and when, keep the mixing area tidy, and speak up early when cement or the silo is running low. Look out for each other too."},
      {t:"judge",q:"Good teamwork, or not?",labels:["Good","Not good"],items:[
        {text:"Telling your labourer you’ll need more mortar in half an hour",good:true,why:"A heads-up means nobody’s left waiting."},
        {text:"Leaving the hose and mixer lead across the walkway",good:false,why:"It’s a trip hazard for everyone."},
        {text:"Letting the site manager know the silo’s nearly empty",good:true,why:"A refill takes time to arrange."},
        {text:"Keeping quiet about a faulty mixer so work isn’t held up",good:false,why:"Report it and don’t use it. Faulty kit puts everyone at risk."}]},
      {t:"quick",items:[
        {q:"A red ring with a bar means you must not",a:true},
        {q:"A yellow triangle means you must do something",a:false},
        {q:"Wet cement can burn without you feeling it at first",a:true},
        {q:"It’s fine to mix a whole day’s mortar first thing",a:false},
        {q:"Kneeling in wet mortar can burn through your trousers",a:true}]}
    ]},
    /* 6: the challenge asks about the unit from new angles, not the same questions again. */
    {id:"mm6",title:"Unit challenge",blurb:"Ten new questions from across the unit",challenge:true,steps:[
      {t:"banner",kind:"trophy",title:"Unit challenge",text:"Ten new questions from across the unit, getting harder as you go. No teaching this time: it’s all you!",go:"I’m ready",xp:"Bonus coins for finishing"},
      {t:"choice",q:"The spec says *1:½:4½* (cement : lime : sand). How much lime goes with 1 bucket of cement?",opts:["Half a bucket","4½ buckets","1 bucket","None"],a:0,why:"Cement, lime, sand: the middle number, ½, is the lime."},
      {t:"load",q:"You need a bigger batch. Load a *1:4* mix using *2* buckets of cement.",into:"Mixer",items:[bk("cement"),bk("sand")],need:{cement:2,sand:8},hint:"Twice the cement means twice the sand.",why:"2 of cement means 2 × 4 = 8 of sand. Same ratio, bigger batch."},
      {t:"scene",who:"Jay",say:"I tipped the cement into the empty drum first, then the sand and water.",q:"What’s likely to happen?",opts:[
        {text:"Cement sticks to the dry drum and balls up",ok:true,why:"That’s why some water goes in first, and the cement goes in between the sand."},
        {text:"It mixes faster",ok:false,why:"Dry cement in a dry drum sticks and balls up, so the mix is uneven."},
        {text:"Nothing: the order doesn’t matter",ok:false,why:"It does. Water first, then half the sand, the cement, the rest of the sand, then top up the water."}]},
      {t:"label",q:"Label the PPE for mixing",pic:"ppe-person",spots:[
        {x:48,y:30,px:142,py:32,label:"Hard hat"},{x:48,y:70,px:145,py:50,label:"Goggles"},{x:48,y:140,px:114,py:137,label:"Gloves"},
        {x:272,y:52,px:171,py:61,label:"Dust mask"},{x:272,y:112,px:185,py:112,label:"Hi-vis"},{x:272,y:180,px:180,py:194,label:"Boots"}],
        why:"Hard hat, goggles, a dust mask for tipping bags, hi-vis over long sleeves, gloves and boots."},
      {t:"spot",q:"Sam set up the mixer. Tap the mistake.",lines:["Set it up on firm, level ground","Checked the guards were on","Ran the lead across the walkway to reach the socket","Cleaned the drum with water and coarse aggregate at the end of the day"],a:2,why:"A lead across a walkway is a trip hazard. Route it out of the way."},
      {t:"gap",text:"Wet cement is [alkaline], so it can [burn] your skin.",opts:["acidic","cool"],why:"Wet cement is strongly alkaline and can cause serious burns."},
      {t:"tf",pic:"cracks",q:"The wall on the right was probably built with mortar that was too strong.",a:true,why:"The cracks split the bricks instead of following the joints: a sign the mortar was stronger than the bricks."},
      {t:"scene",who:"Your supervisor",say:"It’s half three. You knock off at half four and you’ll lay about 100 more bricks.",q:"How much mortar do you mix?",opts:[
        {text:"Just enough for about 100 bricks",ok:true,why:"Mix what you’ll use. Anything left at the end of the day is waste."},
        {text:"A full mixer, to be on the safe side",ok:false,why:"Most of it would go off before it’s used. That’s wasted cement and money."},
        {text:"None: use this morning’s leftovers in the tub",ok:false,why:"This morning’s mortar will have started to set, so it won’t bond properly."}]},
      {t:"hot",q:"Tap the sign that shows where first aid is",pic:"signs4",a:3,spots:[{x:44,y:42,r:33,label:"Blue sign"},{x:121,y:42,r:33,label:"Red sign"},{x:198,y:42,r:33,label:"Yellow sign"},{x:275,y:42,r:33,label:"Green sign"}],why:"The green square with a white cross is first aid."},
      {t:"build",q:"Build the golden rule for mixers",answer:"Never reach into a turning drum",extra:["always","gloves","mixer"],why:"Switch off and wait for it to stop before anything goes in."}
    ]}
  ]}]);
  add("bricklayer",[
    unit("Jointing Styles",["Jointing styles","Joint protection"],[
      lesson("bk-joint1","Joint finishes","Flush, half round, weather struck and recessed",[
        EX("Four finishes","The joint finish changes how the wall looks and how well it sheds rain. Each picture is cut through the wall, with the face on the left. Tap each one.","joints",[
          [42,60,"Flush","Rubbed flat with the face. Plain and neat, often used where the wall will be painted or rendered."],
          [120,60,"Half round","Also called bucket handle. Pressed in with a round jointer: the most common finish, and it sheds rain well."],
          [198,60,"Weather struck","Pressed in at the top and flush at the bottom, so it slopes out and rain runs off."],
          [276,60,"Recessed","Raked back a few millimetres, square. A strong shadow, but it holds water, so it isn’t for exposed walls."]]),
        HOT("Tap the finish that’s pressed in at the top, so rain runs off","joints",[[42,30,30,"Flush"],[120,30,30,"Half round"],[198,30,30,"Weather struck"],[276,30,30,"Recessed"]],2,"Weather struck: in at the top, flush at the bottom, so water runs off the brick below."),
        TE("Joint when it’s ready","Joint when the mortar is *thumbprint hard*: firm, but still takes a print. Too soon and it smears; too late and it won’t compress. Joint each section at the same stage so the colour stays even.",null,"Thumbprint hard"),
        J("Good jointing, or not?",[["Jointing each panel at the same stage of drying",true,"Same timing, same colour."],["Jointing straight after laying, while it’s wet",false,"Wet mortar smears across the face."],["Using a recessed joint on an exposed seafront wall",false,"Recessed joints hold water. Exposed walls need a weather-resisting finish."],["Brushing off the face once the joint is firm",true,"A soft brush lifts the crumbs without smearing."]]),
        SC("Your supervisor","The client wants the new extension to match the house, which has a bucket handle finish.","What do you use?",[["A round jointer, for a half round finish",""+"Half round is the same as bucket handle."],["A flat trowel, for flush joints","That gives a flush finish, which won’t match."],["A raking tool, for recessed joints","That gives a recessed finish, which won’t match."]]),
        G("A [half] round joint is also called a bucket [handle] joint.",["full","bucket"],"Half round and bucket handle are the same finish.")
      ]),
      lesson("bk-joint2","Protecting the work","Frost, rain, damage, PPE and the team",[
        SC("A frosty morning","It’s 2°C and still dropping. The gang wants to crack on with the wall.","What’s the right call?",[["Don’t lay bricks: it’s 3°C and falling, and new mortar can freeze","Frozen mortar loses its strength and bond. Wait until it’s above 1°C and rising, and protect yesterday’s work."],["Lay them, but add extra cement","Extra cement doesn’t stop mortar freezing."],["Lay them and cover them tonight","The damage can happen before tonight, as the mortar freezes."]]),
        TE("Cover it up","Protect new work from rain and frost: cover the top with a waterproof sheet, held clear of the face so it doesn’t mark it, and weight it down. Keep stacked bricks and blocks covered and off the ground too.","protect"),
        S("What does each one protect against?",["Frost","Rain","Damage"],[["Insulated covers overnight in winter",0,"Keeps frost off new mortar."],["Sheet over the top of the wall",1,"Stops rain washing out the joints."],["Boards over finished sills and reveals",2,"Stops knocks from barrows and other trades."],["Stacking bricks off the ground and covered",1,"Wet bricks can cause staining and efflorescence."],["Stopping work at 3°C and falling",0,"Mortar can freeze before it sets."]]),
        LB("Label the PPE for jointing and cleaning down","ppe-person",[[48,30,142,32,"Hard hat"],[48,70,145,50,"Goggles"],[48,140,114,137,"Gloves"],[272,112,185,112,"Hi-vis"],[272,180,180,194,"Boots"]],"Goggles for splashes and grit, gloves for cement, boots, hard hat and hi-vis."),
        J("Good teamwork?",[["Leaving your finished wall covered for the next trade",true,"Protected work saves someone else a repair."],["Pushing a barrow into someone else’s fresh brickwork",false,"Take care around other people’s work."],["Telling the scaffolders a sheet is weighted on the lift",true,"Everyone knows what’s up there."],["Leaving mortar smears for the cleaners",false,"Clean as you go."]],["Good","Not good"]),
        QF([["Weather struck joints shed rain",true],["Recessed joints suit exposed walls",false],["Joint when thumbprint hard",true],["Lay bricks at 2°C and falling",false]])
      ]),
      lesson("bk-joint3","Unit challenge","Jointing and protecting the work",[
        TROPHY(6),
        Q("A recessed joint was used on a wall facing the sea. What’s the likely problem?",["Rain sits on the ledge and gets into the joint","It dries too fast","It looks too plain","Nothing"],"Recessed joints hold water, so they suit sheltered walls."),
        T("Flush joints are rubbed flat with the face of the wall.",true,"That’s flush: level with the brick face."),
        N(["Lay the bricks","Wait until thumbprint hard"],["Joint to the finish, then brush off","Brush straight away","Leave it for tomorrow"],"Joint at thumbprint hard, then lightly brush off."),
        SC("Kai","The sheet on our wall keeps blowing into the fresh joints.","What’s the fix?",[["Hold it clear of the face and weight it down with boards","A sheet touching fresh joints marks them."],["Take it off: it’s doing more harm","Then rain and frost get in."],["Tape it to the bricks","Tape can mark the face and won’t hold."]]),
        SP("Sam’s end-of-day checklist. Tap the mistake.",["Covered the top of the wall","Weighted the sheet down","Left the bricks unwrapped on the ground","Cleaned the tools"],2,"Bricks should be stacked off the ground and covered."),
        B("Build the rule for cold weather","Stop at 3 degrees and falling",["rising","5","start"],"Stop laying at 3°C and falling.")
      ],{challenge:true})
    ]),
    unit("Repair brick walling","Brick repairs",[
      lesson("bk-repair1","Spotting defects","What’s wrong with the wall, and why",[
        EX("What’s wrong here?","Before you repair anything, work out what’s caused it. Tap each problem on this wall.","defects",[
          [54,12,"Spalling","The face has broken off, usually because water got in and froze."],
          [145,55,"Efflorescence","White salts left as the wall dries out. It usually brushes off once dry."],
          [232,40,"Stepped crack","A crack following the joints: the wall has moved or settled. Report it."],
          [80,86,"Crumbling joints","Weathered mortar that needs raking out and repointing."]]),
        M("Match the defect to its likely cause",[["Spalled brick face","Frost and water getting in"],["White salt deposits","Salts drying out of the wall"],["Stepped crack","Movement or settlement"],["Crumbling joints","Old, weathered mortar"]],"Find the cause, or the problem comes back."),
        TE("When to shout","Small defects you can repair. A long or widening crack, a bulging wall or a lintel that’s dropped can mean a structural problem. Stop and report it before anyone patches it."),
        J("Repair it, or report it?",[["A single spalled brick",true,"Cut it out and replace it."],["A stepped crack running up two storeys",false,"That could be structural. Report it."],["Crumbling joints on a garden wall",true,"Rake out and repoint."],["A bulge in the middle of a wall",false,"Report it: the wall may be unstable."]],["Repair it","Report it"]),
        TAP("Tap the word for the white salts on a new wall","Brush off the {efflorescence} once the wall is dry",'It’s called efflorescence.'),
        SC("Your supervisor","There’s white powder all over the new garden wall.","What do you do?",[["Let it dry out, then brush it off dry","Efflorescence usually disappears as the wall dries. Washing adds more water and salts."],["Scrub it with water","Water brings more salts to the surface."],["Paint over it","It’ll push through the paint."]])
      ]),
      lesson("bk-repair2","Replacing a brick safely","Cutting out, bedding in, asbestos and waste",[
        O("Put replacing a brick in order",["Check it’s safe and set up the work area","Cut out the brick and mortar with a plugging chisel and club hammer","Clean out and dampen the hole","Butter the new brick and bed it in","Point the joints to match"],"Clean, damp and well-filled joints give a sound repair.",
          {again:N(["Cut out the old brick","Clean out the hole"],["Dampen it, then butter and bed the new brick","Paint the hole","Leave it overnight"],"A damp hole stops the new mortar drying out too fast.")}),
        Q("What should a good repair match?",["Brick colour, size and texture, the mortar and the joint finish","Just the size","Only the joint","Nothing: it’s just a repair"],"A good repair is hard to spot."),
        TE("Asbestos","Buildings from before 2000 can contain asbestos: old boards, flue pipes, cement sheets. The fibres can cause fatal disease years later. If you suspect it: stop, don’t disturb it, keep people away and tell your supervisor.","sign-warn"),
        SC("On a repair job","You uncover an old grey flue pipe behind the brickwork.","What do you do?",[["Stop, leave it alone and tell your supervisor","It could be asbestos. Only licensed people deal with it."],["Cut it out carefully","Cutting releases fibres."],["Sweep up the dust and carry on","Sweeping spreads fibres."]]),
        M("Match the document to what it does",[["Risk assessment","The hazards and how to control them"],["Method statement","The safe way to do the job, step by step"],["Toolbox talk","A short safety briefing"],["Site induction","The site rules when you start"]],"Read them before you start."),
        J("Good for the environment?",[["Cleaning and reusing sound bricks",true,"Less waste, less cost."],["Washing mortar into the drain",false,"It pollutes water."],["Separating waste into the right skips",true,"So it can be recycled."],["Burning plastic wrap",false,"Never burn waste on site."]])
      ]),
      lesson("bk-repair3","Unit challenge","Defects and repairs",[
        TROPHY(6),
        HOT("Tap the defect you should report rather than patch","defects",[[54,12,20,"Spalled brick"],[145,55,26,"White salts"],[232,40,30,"Stepped crack"],[80,86,24,"Crumbling joints"]],2,"A stepped crack means movement. Report it so it can be checked."),
        Q("Why dampen the hole before bedding a new brick?",["So the old brickwork doesn’t suck the water out of the new mortar","To clean it","To make it set faster","To cool it"],"Dry brickwork draws water out and weakens the bond."),
        T("You should wear a dust mask and carry on if you disturb possible asbestos.",false,"Stop, leave it and report it."),
        Q("What does “perp” mean?",["The vertical joint between bricks","A type of brick","The top course","A level"],"Short for perpendicular joint."),
        SP("Jay’s repair. Tap the mistake.",["Set up a barrier below the work","Cut out the brick with a plugging chisel","Bedded the new brick into the dry, dusty hole","Pointed the joints to match"],2,"The hole should be cleaned out and dampened first."),
        B("Build the golden rule for defects","Find the cause before you repair",["hide","paint"],"Or the problem comes back.")
      ],{challenge:true})
    ]),
    unit("Basic Brick wall","Setting out a solid wall",[
      lesson("bk-basic1","Building a simple wall","Gauge, ends first and a line",[
        TE("Gauge","Every course is *75 mm*: a 65 mm brick plus a 10 mm bed joint. Keep to gauge and your courses line up with openings, DPCs and the next wall.","course75","Gauge"),
        G("A 65 mm brick plus a 10 mm joint makes a [75] mm course.",["65","85"],"65 + 10 = 75 mm."),
        Q("How many courses make a wall 300 mm high?",["4","3","5","30"],"300 ÷ 75 = 4 courses."),
        TE("Ends first","Build the ends (corners) first, checking level and plumb. Then run a line between them with line and pins, and lay the middle to the line so it comes out straight and level."),
        O("Put building a simple wall in order",["Check the base is clean and level","Dry-bond the first course","Build up the ends","Run in the courses to the line","Finish with a capping or coping"],"The ends control the line, so they go up first.",
          {again:Q("Why build the ends first?",["They hold the line so the middle comes out straight and level","It’s quicker","So the middle can be skipped","It uses less mortar"],"Line and pins between the ends guide every course.")}),
        TE("Top it off","A wall’s top needs protecting from rain. A coping with a drip under each overhang throws water clear, usually with a DPC underneath to stop water soaking down.","coping"),
        T("A coping with a drip throws water clear of the wall face.",true,"The drip stops water running back and staining the wall.")
      ]),
      lesson("bk-basic2","Tools and how buildings work","Using and caring for your tools",[
        EX("Your hand tools","Tap each tool.","tools",[[34,36,"Trowel","Spreads and cuts mortar. Clean it off before it sets."],[142,30,"Spirit level","Checks level and plumb. Check it’s accurate by reversing it."],[250,24,"Line and pins","Stretched between the ends to keep courses straight."],[45,82,"Bolster","With a club hammer, cuts bricks cleanly."],[149,85,"Club hammer","Heavy hammer for the bolster and plugging chisel."],[254,86,"Jointer","Presses in the joint finish."]]),
        M("Match the tool to its job",[["Spirit level","Level and plumb"],["Line and pins","Straight courses"],["Bolster and club hammer","Cutting bricks"],["Jointer","Finishing joints"]],"The right tool for each job."),
        SC("Kai","The head of my club hammer’s loose. I’ll tape it.","What do you say?",[["Stop using it and get it repaired or replaced","A flying hammer head can seriously hurt someone."],["Tape’s fine for light work","It can still come off."],["Just be careful","Care doesn’t stop it flying off."]]),
        J("Looking after your tools",[["Cleaning your trowel before the mortar sets",true,"Hard mortar ruins the blade."],["Leaving your level in the back of the van loose",false,"Knocks put it out of true."],["Storing tools dry at the end of the day",true,"Dry tools don’t rust."],["Using a level as a straight edge to tap bricks",false,"Hitting it knocks it out."]]),
        TE("How a building works","Foundations spread the load into the ground. Walls carry floors and roofs. A DPC stops damp rising, insulation keeps heat in, and cavity trays send water out."),
        M("Match the part to what it does",[["Foundation","Spreads the load into the ground"],["DPC","Stops damp rising"],["Insulation","Keeps the heat in"],["Cavity tray","Sends water out of the cavity"]],"Every part has a job."),
        QF([["A course is 75 mm",true],["Build the middle before the ends",false],["A DPC stops damp rising",true],["A loose hammer head is fine for light work",false]])
      ]),
      lesson("bk-basic3","Unit challenge","Building a simple wall",[
        TROPHY(6),
        Q("A wall needs to be 900 mm high to the top of a course. How many courses?",["12","9","10","15"],"900 ÷ 75 = 12."),
        HOT("Tap the tool that keeps your courses straight between the ends","tools",[[34,36,22,"Trowel"],[142,30,30,"Spirit level"],[250,26,26,"Line and pins"],[45,84,18,"Bolster"],[149,85,26,"Club hammer"],[254,86,26,"Jointer"]],2,"Line and pins, stretched between the ends."),
        SP("Sam’s wall. Tap the mistake.",["Checked the base was level","Built both ends first","Laid the middle without a line","Finished with a coping"],2,"Without a line, the middle won’t be straight or level."),
        T("Putting health and safety first means stopping work if something is unsafe.",true,"No job is worth an injury."),
        Q("What’s the drip under a coping for?",["To make rain drop clear of the wall face","To hold the coping on","To let air in","Decoration"],"Water falls off the drip instead of running down the face."),
        B("Build the gauge rule","One course is 75 mm",["65","two"],"65 mm brick plus a 10 mm joint.")
      ],{challenge:true})
    ]),
    unit("Set out solid walling","Setting out a solid wall",[
      lesson("bk-setout1","Setting out from drawings","Square corners and dry bonding",[
        TE("From drawing to ground","Read the drawing for sizes, bond and levels. Mark them on the base with a tape, lines and pins and a square. Then dry-bond the first course to check the bond and plan any cuts."),
        TE("Is it square?","Measure 3 m along one side and 4 m along the other. If the distance between them is exactly 5 m, the corner is square. You can also check the two diagonals are equal.","square345","3-4-5"),
        G("If one side is 3 m and the other 4 m, the diagonal should be [5] m.",["7","6"],"3, 4, 5 means a right angle."),
        Q("You set out 6 m and 8 m along two sides. What should the diagonal be for a square corner?",["10 m","14 m","12 m","9 m"],"Double 3, 4, 5 is 6, 8, 10.",{again:T("Checking the diagonals are equal is another way to check a rectangle is square.",true,"Equal diagonals mean square corners.")}),
        TE("Piers","A pier strengthens a wall. An *attached pier* is bonded into the wall; an *isolated pier* stands on its own, like a gate pier.","piers"),
        M("Match the feature",[["Attached pier","Bonded into a wall"],["Isolated pier","Stands on its own"],["Banding","A course of contrasting brick"],["Projecting course","Bricks set out from the face"]],"Decorative and structural features."),
        SC("Your supervisor","The drawing says the wall is 4.5 m long, but the site pegs are at 4.3 m.","What do you do?",[["Stop and ask before building","A mistake built in is costly to put right."],["Build to the pegs","They might be wrong."],["Split the difference","That’s still a guess."]])
      ]),
      lesson("bk-setout2","Safe, clear and owning it","Slips, trade words and responsibility",[
        J("Safe site, or trip hazard?",[["Bricks stacked tidily off the walkway",true,"Clear walkways, fewer trips."],["Line and pins left across a path",false,"A tight line at ankle height trips people."],["Offcuts cleared as you go",true,"Tidy as you work."],["Hose across the scaffold boards",false,"Route it out of the way."]],["Safe","Hazard"]),
        M("Match the trade word",[["Perp","Vertical joint"],["Bed joint","Horizontal joint"],["Stretcher","Long face of a brick"],["Header","Short end of a brick"]],"Using trade words keeps things clear."),
        Q("Which is the clearest message to your labourer?",["Can I have two spots of mortar on the left-hand corner, please?","Get me some stuff","More!","You know what I need"],"Say what, how much and where."),
        TE("Own it","Taking ownership means checking your own work, and putting it right or speaking up as soon as something’s wrong."),
        SC("A few courses up","You notice your wall is 10 mm out of gauge.","What now?",[["Correct it now, or tell your supervisor","The earlier it’s fixed, the easier it is."],["Hide it in the joints higher up","That makes thick, uneven joints."],["Blame the bricks","Owning it is part of the job."]]),
        TE("Digital tools","Some sites use digital models, tablets and lasers for setting out. The idea’s the same: accurate information, checked before you build.")
      ]),
      lesson("bk-setout3","Unit challenge","Setting out solid walls",[
        TROPHY(6),
        Q("Why dry-bond the first course?",["To check the bond and plan cuts before using mortar","To save mortar","To test the bricks","It’s quicker"],"It shows how the bond works over the length."),
        T("An isolated pier is bonded into a wall.",false,"That’s an attached pier. Isolated piers stand alone."),
        Q("A corner measures 3 m and 4 m, and the diagonal is 5.1 m. What does that mean?",["The corner isn’t square yet","It’s square","The tape is wrong","It’s close enough"],"For a square corner it must be exactly 5 m."),
        SP("Jay’s setting out. Tap the mistake.",["Read the drawing first","Checked the corner with 3, 4, 5","Guessed the length where the drawing was unclear","Dry-bonded the first course"],2,"If it’s unclear, ask. Don’t guess."),
        TAP("Tap the trade word for the vertical joint","Keep every {perp} plumb and full",'The perp is the vertical joint.'),
        B("Build the rule","If in doubt ask before you build",["guess","then"],"Asking is cheaper than rebuilding.")
      ],{challenge:true})
    ]),
    unit("Build solid walling","Brick bonds",[
      lesson("bk-bond1","Brick bonds","Stretcher, English, Flemish and garden wall",[
        TE("Why bond?","*Bond* is the pattern that stops the vertical joints lining up, so the load spreads and the wall is strong. Half-brick walls use stretcher bond; one-brick walls use English, Flemish or garden wall bonds. Headers are shaded darker here.","bonds","Bond"),
        M("Match the bond to its pattern",[["Stretcher bond","All stretchers, half lap"],["English bond","Courses of headers, then courses of stretchers"],["Flemish bond","Headers and stretchers alternate in each course"],["English garden wall","Three stretcher courses to one header course"]],"Each bond has its own pattern."),
        HOT("Tap the English bond","bonds",[[56,40,48,"First panel"],[160,40,48,"Middle panel"],[264,40,48,"Last panel"]],1,"English bond: a course of headers, then a course of stretchers."),
        TE("Closers","In English and Flemish bond a *queen closer* (a brick cut in half along its length, shown lighter) goes next to the corner header. It sets up the quarter lap so the joints don’t line up.",null,"Queen closer"),
        TE("Garden wall bond","English garden wall bond has three courses of stretchers, then a course of headers. It’s quicker to lay and looks good on both faces.","garden-bond"),
        Q("What is broken bond?",["Cut bricks used where the length doesn’t fit whole bricks","A wall that’s fallen down","Mixing brick colours","Leaving out headers"],"Put it in the middle or under an opening, where it’s least seen."),
        T("In stretcher bond, each brick sits halfway over the two below it.",true,"That’s a half lap.")
      ]),
      lesson("bk-bond2","Soldiers, drawings and waste","Special courses, information and the environment",[
        TE("Soldiers and brick-on-edge","A *soldier course* is bricks stood on end. *Brick-on-edge* is bricks laid on their side across the wall, often as a capping. Set them out from the centre so any cuts are equal.","soldier"),
        T("Soldier courses need careful gauge so the perps stay plumb and even.",true,"Any error shows straight away."),
        TE("Drawings and specifications","Drawings show plans, elevations and sections at a scale. The specification says the materials and standards, like the brick, mortar mix and joint finish."),
        Q("On a 1:20 drawing, a pier measures 22 mm wide. What is its real width?",["440 mm","220 mm","22 mm","2.2 m"],"22 × 20 = 440 mm.",{again:G("On a 1:50 drawing, 10 mm is [500] mm in real life.",["50","5,000"],"10 × 50 = 500 mm.")}),
        S("Where does each waste go?",["Reuse","Recycle","Never"],[["Clean brick offcuts",0,"Use them as cuts elsewhere."],["Pallets",1,"Back to the supplier or recycled."],["Washout into the drain",2,"Cement pollutes water. Use a washout area."],["Plastic wrap",1,"Separate it for recycling."],["Burning waste",2,"Never burn waste on site."]]),
        SC("Your labourer","The mixer needs washing out and the drain’s right there.","What do you say?",[["Use the washout area, never the drain","Cement washout pollutes water."],["The drain’s fine for a bit","Even a little pollutes."],["Tip it in the hedge","That pollutes the ground."]])
      ]),
      lesson("bk-bond3","Unit challenge","Bonds and special courses",[
        TROPHY(7),
        Q("Which bond has headers and stretchers alternating along every course?",["Flemish","English","Stretcher","English garden wall"],"Flemish: header, stretcher, header, stretcher."),
        HOT("Tap the wall with only stretchers","bonds",[[56,40,48,"First panel"],[160,40,48,"Middle panel"],[264,40,48,"Last panel"]],0,"Stretcher bond is all stretchers, half lap."),
        T("A queen closer is a brick cut in half across its length.",false,"It’s cut along its length, so it’s half as wide."),
        Q("How many stretcher courses are there between header courses in English garden wall bond?",["3","1","5","2"],"Three stretcher courses, then one header course."),
        SP("Kai’s soldier course. Tap the mistake.",["Set it out from the centre","Checked each perp was plumb","Put all the cuts at one end","Kept the joints even"],2,"Set out from the centre so cuts are equal at both ends."),
        Q("Where should broken bond go?",["In the middle or under an opening","At the corners","At the top","Anywhere"],"Where it’s least seen."),
        B("Why do we bond?","So the vertical joints never line up",["always","horizontal"],"Bonding spreads the load.")
      ],{challenge:true})
    ]),
    unit("Set out Cavity Walling","Cavity wall setting out",[
      lesson("bk-cset1","Setting out a cavity wall","Profiles, gauge rods, DPCs and trays",[
        EX("A cavity wall","Two leaves, usually brick outside and block inside, with a cavity between, tied together. Tap each part.","cavity",[[123,42,"Brick","The outer leaf, the face you see."],[169,42,"Insulation","Keeps the heat in. Fitted tight to the inner leaf, leaving a clear cavity."],[199,42,"Block","The inner leaf, carrying the floors and roof."],[146,69,"Wall tie","Ties the two leaves together. The drip in the middle stops water crossing the cavity."],[123,136,"DPC","Stops damp rising up the wall. It goes in both leaves."]]),
        TE("DPC height","The DPC goes in both leaves, at least *150 mm* above the finished ground level, so rain splashing off the ground can’t soak up the wall.","dpc150"),
        G("The DPC must be at least [150] mm above ground level.",["50","75"],"At least 150 mm."),
        TE("The gauge rod","A gauge rod is marked every 75 mm course, with the sill, lintel and floor heights. Check each corner against it so both leaves and the openings line up.","gaugerod","Gauge rod"),
        O("Put setting out in order",["Check the drawings and levels","Set up profiles and lines","Check it’s square","Mark openings with the gauge rod","Lay the first courses and the DPC"],"Accurate setting out saves problems higher up.",
          {again:Q("What does the gauge rod show?",["Course heights, and sill and lintel levels","The mortar mix","The wall length","The weather"],"Every course, plus the key heights.")}),
        SC("Your supervisor","Where do the cavity trays go on this job?","You answer:",[["Over openings and wherever the cavity is bridged, with weep holes","Trays catch water in the cavity and send it out through weep holes."],["At the bottom of the foundation","That’s not where water needs to get out."],["Only at the roof","Water gets into the cavity all the way down."]])
      ]),
      lesson("bk-cset2","Materials, quantities and the rules","Estimating and keeping safe",[
        Q("About how many bricks make 1 m² of half-brick wall?",["60","100","30","150"],"About 60 a square metre."),
        Q("Blocks need about 10 a square metre. How many for 12 m²?",["120","12","60","240"],"10 × 12 = 120, plus a little for waste."),
        Q("A half-brick outer leaf needs about 60 bricks a square metre. How many for 12 m²?",["720","600","60","1,200"],"60 × 12 = 720."),
        TE("Wall ties","Ties usually go about 900 mm apart along and 450 mm up, with extra ties within 225 mm of openings."),
        S("Which regulation covers it?",["COSHH","PUWER","RIDDOR"],[["Cement and other hazardous substances",0,"Control of Substances Hazardous to Health."],["A mixer being safe and maintained",1,"Provision and Use of Work Equipment."],["Reporting a serious accident",2,"Reporting of Injuries, Diseases and Dangerous Occurrences."],["Checking the disc cutter guard",1,"Work equipment must be safe."]]),
        TE("Efflorescence","White salts can appear as new brickwork dries. It usually brushes off once dry. Keeping bricks covered on site helps prevent it."),
        T("Asking an experienced bricklayer to show you a technique is a good way to learn.",true,"Seeking learning is part of being a good apprentice.")
      ]),
      lesson("bk-cset3","Unit challenge","Setting out cavity walls",[
        TROPHY(6),
        HOT("Tap the part that stops damp rising","cavity",[[123,42,14,"Brick"],[169,42,13,"Insulation"],[199,42,14,"Block"],[123,136,11,"DPC"]],3,"The DPC, in both leaves."),
        Q("Ground level is at 0. What’s the lowest the DPC can be?",["150 mm above","At ground level","75 mm above","50 mm below"],"At least 150 mm above."),
        T("Weep holes let water out above cavity trays.",true,"So water in the cavity drains to the outside."),
        Q("Roughly how many bricks for 8 m² of half-brick wall?",["480","80","640","800"],"60 × 8 = 480."),
        SP("Jay’s setting out. Tap the mistake.",["Checked the drawing","Set up the profiles","Put the DPC 75 mm above the ground","Checked the corners were square"],2,"It must be at least 150 mm above ground."),
        B("Build the DPC rule","At least 150 above the ground",["below","75"],"150 mm minimum.")
      ],{challenge:true})
    ]),
    unit("Construct Cavity Walling","Cavity wall construction",[
      lesson("bk-cbuild1","Building the cavity wall","Ties, insulation and a clean cavity",[
        TE("Build it clean","Build both leaves together and keep the cavity clear of mortar. Wall ties lie level or slope slightly down to the outer leaf, with the drip in the middle, so water can’t run inwards.","cavity"),
        Q("Which way can a wall tie slope?",["Level, or slightly down to the outer leaf","Down towards the inner leaf","Steeply up","It doesn’t matter"],"Never towards the inside, or water follows it in."),
        J("Good cavity work?",[["Cleaning mortar off the ties as you go",true,"Mortar on a tie can carry water across."],["Leaving droppings at the bottom of the cavity",false,"They can bridge the cavity and let damp in."],["Fitting insulation boards tight together",true,"Gaps let heat out."],["Ties with the drip against the inner leaf",false,"The drip goes in the middle of the cavity."]]),
        O("Put building the leaves in order",["Lay the courses to the line","Place wall ties at the right spacing","Fit the insulation tight","Clean the ties and cavity as you go"],"Ties and insulation go in as the wall rises."),
        TE("Fire stopping","Cavity barriers and fire stopping close the cavity where the drawings say, so fire and smoke can’t travel up inside the wall."),
        T("Fire stopping stops fire and smoke travelling through the cavity.",true,"It closes the cavity at key points.")
      ]),
      lesson("bk-cbuild2","Fire, warmth and wellbeing","Extinguishers, energy and support",[
        EX("Fire extinguishers","All UK extinguishers are red, with a coloured band. Tap each one.","extinguishers",[[40,56,"Water","Wood, paper and fabric. Never on electrics."],[120,56,"Foam","Flammable liquids like petrol, and wood and paper."],[200,56,"CO2","Electrical fires. The horn gets very cold: don’t hold it."],[280,56,"Powder","Many types, including gas, but it makes a mess and can be hard to see through."]]),
        HOT("Tap the extinguisher for an electrical fire","extinguishers",[[40,62,28,"Water"],[120,62,28,"Foam"],[200,62,28,"CO2"],[280,62,28,"Powder"]],2,"CO2, with the black band. Never water on electrics."),
        TE("Warm, dry buildings","Insulation keeps heat in, airtightness stops draughts and ventilation lets moist air out. Gaps in insulation or open joints make cold spots where heat escapes."),
        Q("What happens if insulation boards have gaps?",["Heat escapes and cold, damp spots can form","Nothing","The wall is stronger","The room is warmer"],"Tight joints matter."),
        TE("Wellbeing","Long hours, stress and heavy work take a toll. Talk to someone, use your employer’s support or a mental health first aider, or call the Construction Industry Helpline."),
        SC("On site","A workmate has been quiet and withdrawn for weeks.","What’s a good step?",[["Check in with them privately and point them to support","A quiet word can make a big difference."],["Joke about it to lighten the mood","It might make them feel worse."],["Ignore it: it’s not your business","Looking out for each other matters."]])
      ]),
      lesson("bk-cbuild3","Unit challenge","Building cavity walls",[
        TROPHY(6),
        Q("Mortar droppings have built up at the bottom of the cavity. What’s the risk?",["Damp can cross to the inner leaf","The ties rust","The wall sets too fast","None"],"Droppings bridge the cavity."),
        T("Water extinguishers are safe on electrical fires.",false,"Water conducts electricity."),
        SP("Sam’s cavity wall. Tap the mistake.",["Built both leaves together","Cleaned the ties as she went","Sloped the ties down to the inner leaf","Fitted the insulation tight"],2,"Ties must never slope down to the inner leaf."),
        Q("What does fire stopping do?",["Closes the cavity so fire and smoke can’t travel through it","Puts out fires","Makes the wall stronger","Keeps rain out"],"It closes the cavity at key points."),
        Q("Which extinguisher suits burning petrol?",["Foam","Water","CO2 only","None"],"Foam, with the cream band."),
        B("Build the tie rule","Never slope ties to the inside",["always","outside"],"Water would follow them in.")
      ],{challenge:true})
    ]),
    unit("Cavity opening","Lintels",[
      lesson("bk-open1","Forming an opening","Reveals, closers, lintels and trays",[
        TE("An opening","Set the opening out with the gauge rod, build the reveals plumb, close the cavity with an insulated closer, and bed the lintel level with at least *150 mm* bearing each end. The tray and weep holes go above the lintel.","opening"),
        LB("Label the opening","opening",[[44,24,100,40,"Lintel"],[282,20,215,20,"Soldier course"],[44,120,108,112,"Sill"],[282,60,190,33,"Weep hole"]],"Lintel over the opening, soldiers above, weep holes to let water out, and the sill below."),
        G("A lintel usually needs at least [150] mm bearing at each end.",["25","50"],"Check the maker’s instructions and the drawing."),
        M("Match the part to its job",[["Cavity closer","Closes and insulates the cavity at the reveal"],["Lintel","Carries the load over the opening"],["Sill","Throws water off below the window"],["Cavity tray","Sends water out above the opening"]],"Each part keeps the opening strong and dry."),
        O("Put forming an opening in order",["Set out the width and height","Build the reveals plumb with closers","Bed the lintel level with the right bearing","Fit the cavity tray and weep holes","Continue the courses above"],"Openings must be exactly the size on the drawing."),
        TE("Movement joints","Long walls expand and shrink. Movement joints are left clear of mortar, filled with compressible filler and sealed, so the wall can move without cracking.","movement"),
        T("A movement joint should be filled solid with mortar.",false,"That stops it moving and defeats the point.")
      ]),
      lesson("bk-open2","Standards, modern methods and inclusion","Rules, new ways to build, and fairness",[
        M("Match the standard",[["British Standards","Agreed ways to make and build things"],["Building Regulations","Legal rules for safe, warm buildings"],["Warranty standards","Quality rules for new homes"],["Specification","What this job must use"]],"Different rules for different things."),
        TE("Modern methods","Precast lintels, corner profiles, timber or steel frames clad in brick and masonry support systems all speed up building. Accuracy still matters."),
        Q("What are corner profiles for?",["Holding the lines accurately at corners","Replacing bricklayers","Measuring mortar","Supporting the roof"],"You build to the line they hold."),
        TE("Equity, diversity and inclusion","*Equity* is fair treatment and access. *Diversity* is valuing differences. *Inclusion* means everyone feels part of the team."),
        J("Inclusive, or not?",[["Introducing a new starter to the gang",true,"Small things make people feel welcome."],["“Banter” about someone’s religion",false,"That isn’t acceptable."],["Explaining trade words to someone new",true,"Everyone learns faster."],["Leaving someone out of the brew round",false,"It’s a small thing that says a lot."]],["Inclusive","Not inclusive"]),
        SC("On site","Someone’s “banter” about a colleague’s background is making them uncomfortable.","What do you do?",[["Challenge it or report it, and check they’re OK","Everyone deserves to feel safe at work."],["Laugh along so it blows over","That makes it worse."],["Ignore it","Saying nothing lets it carry on."]])
      ]),
      lesson("bk-open3","Unit challenge","Openings and standards",[
        TROPHY(6),
        HOT("Tap the part that carries the load over the opening","opening",[[160,40,28,"Lintel"],[160,20,22,"Soldier course"],[160,112,22,"Sill"],[160,80,26,"Opening"]],0,"The lintel."),
        Q("Where do weep holes go at an opening?",["In the course just above the lintel and tray","Under the sill","In the inner leaf","At the corners"],"Just above the tray, so water drains out."),
        T("Movement joints are filled with compressible filler and sealant.",true,"No mortar, so the wall can move."),
        SP("Jay’s opening. Tap the mistake.",["Built the reveals plumb","Fitted insulated closers","Gave the lintel 50 mm bearing","Fitted the tray and weep holes"],2,"Lintels usually need at least 150 mm bearing."),
        Q("Which sets the legal rules for safe, warm buildings?",["Building Regulations","The specification","Warranty standards","British Standards"],"Building Regulations are the law."),
        B("Build the lintel rule","At least 150 bearing each end",["mm","25"],"Check the drawing too.")
      ],{challenge:true})
    ]),
    unit("Gable end/Raked wall",["Raking cuts","Cutting bricks"],[
      lesson("bk-gable1","Raking walls and cuts","Setting out the rake and cutting to it",[
        TE("The rake","A gable follows the slope of the roof. Set a line or template to the angle on the drawing, then cut each brick to the line, so the rake is straight and the joints stay even.","gable","Rake"),
        TE("Cutting by hand","Mark the cut on all faces. With eye protection and gloves on, set the bolster on the line and strike firmly with the club hammer. Then trim the edge with a brick hammer or scutch.","bolster"),
        O("Put cutting a brick by hand in order",["Mark the cut on all faces","Put on eye protection and gloves","Set the bolster on the line","Strike firmly with the club hammer","Trim the edge"],"Marking all faces keeps the cut square."),
        Q("How do you keep a raking cut line straight?",["Use a line or template set to the rake","Guess each brick","Follow the last brick","Use a level only"],"The line gives every cut the same angle."),
        T("Offer each brick up to the rake line and mark it before cutting.",true,"Measure twice, cut once.")
      ]),
      lesson("bk-gable2","Power tools and height","Cutting safely and working up high",[
        TE("Disc cutters","Cutting bricks and blocks makes silica dust, which can cause serious lung disease. Only use a disc cutter if you’re trained, with the guard on, water suppression or extraction, and eye, ear and dust protection (FFP3)."),
        J("Safe with power tools?",[["Water suppression on the disc cutter",true,"It keeps the dust down."],["Taking the guard off to see the line",false,"Never remove the guard."],["Using 110 V tools on site",true,"Safer voltage."],["Cutting in a crowd without warning anyone",false,"Keep others clear of dust and debris."]]),
        TE("Working at height","Gables are built at height: use a proper scaffold with guard rails and toe boards, keep it clear and never overload it. Confined spaces need a permit and training."),
        SC("Up on the scaffold","A guard rail is missing on your lift.","What do you do?",[["Don’t use it, and report it","Only competent people alter scaffolding."],["Work carefully near the edge","One slip is all it takes."],["Tie a rope across","That isn’t a guard rail."]]),
        M("Match the power tool to a safe way to use it",[["Disc cutter","Trained, guard on, dust control"],["Mixer","Switched off before reaching in"],["Drill","Right bit and a firm grip"],["110 V tools","Yellow leads and plugs"]],"Every tool has its rules."),
        T("Taking ownership means checking your own work and putting mistakes right.",true,"Your name is on your work.")
      ]),
      lesson("bk-gable3","Unit challenge","Raking walls and cutting",[
        TROPHY(6),
        Q("What causes the dust from cutting bricks to be so harmful?",["Silica","Salt","Lime","Water"],"Silica dust can cause serious lung disease."),
        N(["Mark the cut on all faces","Put on eye protection and gloves","Set the bolster on the line"],["Strike firmly with the club hammer","Soak the brick","Lay it"],"Then trim the edge."),
        T("It’s fine to work from a scaffold with a missing guard rail if you’re careful.",false,"Don’t use it. Report it."),
        SP("Kai’s gable. Tap the mistake.",["Set a line to the rake","Marked each brick against the line","Cut freehand by eye to save time","Wore eye protection"],2,"Cut to the line, or the rake won’t be straight."),
        Q("Which protection is needed when using a disc cutter?",["Eye, ear and dust protection","Just gloves","None with water","Only a hard hat"],"All three, plus training."),
        B("Build the cutting rule","Measure twice and cut once",["three","never"],"Offer it up, mark it, then cut.")
      ],{challenge:true})
    ])
  ]);
})();
