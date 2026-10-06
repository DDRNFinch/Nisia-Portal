/* Teach me: English, Functional Skills Level 2, one lesson per area, with workplace examples. No off-the-job time.
   Each lesson teaches a little, lets you try it, teaches the next bit, then finishes with a quick challenge. */
(function(){
  const {TE,W,CD,Q,T,M,O,G,B,TAP,S,J,SP,N,SC,HOT,LB,QF,CHAL,lesson,unit}=window.EVIA_TEACH,fs={fs:"english"};
  window.EVIA_TEACH.fs.push(
    unit("Reading","",[
      lesson("e2-read","Reading","Skimming, scanning and reading closely",[
        CD("Three ways to read",[["Skim","Skim","Get the gist: headings and first lines"],["Scan","Scan","Find one thing fast: a date, a size, a name"],["Read closely","Read closely","Every detail matters, like a method statement"]]),
        M("Match the task to the way to read",[["Find the delivery date on a letter","Scan"],["See what a leaflet is about","Skim"],["Follow a risk assessment","Read closely"]],"Pick the right speed."),
        TE("Scanning a list","Know what you’re looking for, then run your eye down the list for just that word.","delnote"),
        Q("Scan the note. How many wall ties arrived?",["250","2,000","4","10"],"Find ‘Wall ties’, read across.",{pic:"delnote",again:Q("How many steel lintels?",["4","10","250","1"],"Scan for ‘lintels’.",{pic:"delnote"})}),
        CHAL(),
        SC("A new notice","A notice goes up in the cabin about changes to the site.","What do you do first?",[["Skim the heading and first lines to see if it affects you","Then read closely if it does."],["Read every word twice","Slow if it doesn’t apply."],["Ignore it until break","It might affect you now."]]),
        T("Headings, bullets and bold text help you find information quickly.",true,"Use the layout.")
      ]),
      lesson("e2-understand","Understanding information","Main points, purpose and meaning",[
        TE("Main point and purpose","Ask: what is this *mostly about*? And *why* was it written: to inform, instruct, persuade or describe?"),
        S("What’s the purpose?",["Instruct","Persuade","Inform"],[["A method statement",0,"Tells you what to do."],["A timber merchant’s advert",1,"Wants you to buy."],["A site newsletter",2,"Tells you what’s happening."],["“Hard hats must be worn”",0,"An instruction."]]),
        TE("Unknown words","Use the words around it to work out the meaning. If it’s still not clear, check a dictionary."),
        TAP("Tap the word that tells you this is a must, not a choice","Hard hats {must} be worn beyond this point.","“Must” makes it an instruction.","Look for the command word."),
        CHAL(),
        Q("Where is the main point usually found in a workplace document?",["Near the start, in headings and opening lines","Always the last sentence","In the page numbers","In the footnotes"],"Writers put it up front."),
        T("An advert’s main purpose is to inform.",false,"To persuade.")
      ]),
      lesson("e2-find","Finding and selecting information","Getting what you need from documents",[
        TE("Find and select","Know what you need *before* you start. Use the contents, headings, tables and index. Pick only what answers your question."),
        O("Put finding information in order",["Decide exactly what you need","Check the contents or index","Scan the right section","Read that part closely"],"Narrow it down, then read."),
        Q("Which part of a manual finds a topic fastest?",["The contents page or index","The front cover","The last page","The copyright notice"],"They list topics with pages."),
        CHAL(),
        Q("On the delivery note, what’s listed after Steel lintels?",["Building sand","Cement","Wall ties","Facing bricks"],"Scan down the list.",{pic:"delnote"}),
        T("Copy out everything you read in case it’s useful.",false,"Select only what answers the question.")
      ]),
      lesson("e2-compare","Comparing information","Spotting similarities and differences",[
        TE("Comparing","Compare the *same things* in each text: what they say, who wrote them, why, how up to date they are, and how they present it."),
        J("Worth comparing between two sand quotes?",[["Price",true,"Of course."],["Delivery time",true,"Cheap is no good if it’s late."],["What’s included",true,"VAT? Delivery?"],["The logo",false,"Doesn’t affect value."]]),
        TE("Comparison words","Words like *similarly* and *both* show things are alike. *However* and *whereas* show a difference."),
        S("Same or different?",["Same","Different"],[["Similarly",0,"Alike."],["However",1,"A contrast."],["Both",0,"Shared."],["Whereas",1,"A contrast."]]),
        CHAL(),
        Q("Two websites give different drying times. Which do you trust?",["The manufacturer’s data sheet","The one with more pictures","The first you found","Guess"],"The official source."),
        T("A newer version of a document can replace an older one.",true,"Check dates and revisions.")
      ]),
      lesson("e2-fact","Fact, opinion and bias","Telling them apart",[
        TE("Fact or opinion?","A *fact* can be checked and proved. An *opinion* is what someone thinks. *Bias* is when a text only gives one side."),
        S("Fact or opinion?",["Fact","Opinion"],[["Cement is alkaline",0,"Can be checked."],["This is the best brick on the market",1,"A judgement."],["The board is 18 mm thick",0,"Measurable."],["Our service is second to none",1,"A judgement."]]),
        TAP("Tap the word that shows an opinion","This is the {best} saw we have ever sold.","“Best” is a judgement.","Look for a judging word."),
        CHAL(),
        Q("An advert only quotes happy customers. This is…",["Bias","A fact","A formal report","An instruction"],"It leaves out the negatives."),
        T("An opinion can be useful even though it isn’t a fact.",true,"An expert’s view is valuable.")
      ]),
      lesson("e2-infer","Inference and conclusions","Reading between the lines",[
        TE("Inference","Inference is working out what *isn’t said directly*, from clues in the text. Back it up with the words that led you there."),
        SC("A note","“Please make sure the mixer is clean before you leave today.”","What can you infer?",[["It hasn’t always been left clean","People write reminders when there’s been a problem."],["The mixer is new","Nothing says that."],["You’re leaving early","Nothing says that."]]),
        TE("Conclusions","A conclusion is a judgement based on the evidence you’ve read."),
        CHAL(),
        Q("“Great effort on the wall. Let’s look at the joints tomorrow.” Best conclusion?",["Good work, but the joints need improving","The wall must come down","The joints are perfect","You’re in trouble"],"Praise, then a clue."),
        T("An inference should be backed up by evidence in the text.",true,"Point to the words.")
      ])
    ],fs),
    unit("Spelling, punctuation and grammar","",[
      lesson("e2-spell","Spelling","Common mistakes and trade words",[
        TE("Spelling tricks","Say it in syllables: *sep-a-rate*. Look for a word inside: there’s ‘a rat’ in sep*a rat*e. Learn the trade words you use most."),
        Q("Which is spelt correctly?",["Necessary","Neccessary","Necesary","Neccesary"],"One collar (c), two sleeves (ss).",{again:Q("Which is spelt correctly?",["Separate","Seperate","Separete","Seprate"],"There’s ‘a rat’ in separate.")}),
        M("Match the word to its meaning",[["Their","Belonging to them"],["There","A place"],["They’re","They are"]],"Sound the same, spelt differently."),
        G("[They’re] bringing [their] tools over [there].",["Where","Were"],"They are, belonging to them, a place."),
        CHAL(),
        Q("The part that spans an opening is a…",["Lintel","Lentil","Lintle","Lintal"],"A lentil is a pulse!"),
        T("“Accommodation” has a double c and a double m.",true,"Room for two c’s and two m’s.")
      ]),
      lesson("e2-punct","Punctuation","Full stops, commas, apostrophes and more",[
        M("Match the mark to its job",[["Full stop","Ends a sentence"],["Question mark","Ends a question"],["Comma","Separates items in a list"],["Apostrophe","Shows belonging or missing letters"]],"The main marks."),
        TE("Apostrophes","Belonging: the *supervisor’s* van. Missing letters: *don’t* = do not. *It’s* = it is; *its* = belonging to it."),
        Q("Which is correct?",["The supervisor’s van is here.","The supervisors van’s is here.","The supervisor’s van’s is here.","The supervisors’s van is here."],"The van belongs to the supervisor."),
        TE("Commas in lists","Commas separate items; *and* joins the last two: sand, cement, lime and water."),
        SP("Tap the sentence with a mistake",["We need sand, cement and water.","The wall and its footing are done.","Its going to rain later.","Don’t leave the mixer running."],2,"It’s = it is."),
        CHAL(),
        Q("Which list is punctuated correctly?",["We need sand, cement, lime and water.","We need sand cement lime and water.","We need, sand, cement, lime and water.","We need sand, cement, lime, and, water."],"Commas between items."),
        T("“Its” with no apostrophe means belonging to it.",true,"The wall and its footing.")
      ]),
      lesson("e2-grammar","Grammar","Tenses, agreement and complete sentences",[
        TE("Complete sentences","A sentence needs a *subject* and a *verb*, and makes sense on its own."),
        Q("Which is a complete sentence?",["I checked the level.","Checked the level.","Because the level.","The level and the square."],"Subject and verb."),
        TE("Agreement and tense","Make the verb agree: the brick *is*, the bricks *are*. Keep to one tense."),
        G("The bricks [were] delivered and I [checked] them.",["was","check"],"Plural takes were; keep the past tense."),
        CHAL(),
        SP("Tap the sentence with a mistake",["The bricks were delivered this morning.","I measured the gap and cut the board.","The joiners was late today.","He and I fitted the door."],2,"Joiners were."),
        T("“Me and him fitted the door” is right in a formal report.",false,"He and I fitted the door.")
      ]),
      lesson("e2-vocab","Vocabulary","Choosing the right word",[
        TE("The right word","Choose *precise* words that suit the reader. Trade terms are fine for your trade, but explain them to a customer. Formal writing avoids slang."),
        M("Match the informal word to a formal one",[["Sorted","Completed"],["Loads of","A large number of"],["Fixed up","Repaired"],["Get","Obtain"]],"Formal swaps."),
        Q("Which word is most precise?",["Plumb","Straight-ish","Good","Fine"],"Plumb means exactly vertical."),
        CHAL(),
        Q("Which is best in a report to a customer?",["The frame was secured with 100 mm screws.","We banged it in with big screws.","It’s well solid now.","Screws went in lol."],"Clear, precise, formal."),
        T("A long word is always better than a short one.",false,"Use the clearest word.")
      ])
    ],fs),
    unit("Writing","",[
      lesson("e2-clear","Writing clearly and accurately","Plan, paragraph and proofread",[
        TE("Clear writing","Plan what you want to say. One main idea per *paragraph*. Keep sentences short. Then *proofread*.","write"),
        O("Put the writing process in order",["Plan your points","Write a first draft","Read it back","Correct mistakes"],"Proofreading catches most mistakes."),
        Q("When should you start a new paragraph?",["When you move to a new main idea","After every sentence","Only at the end","Never in a report"],"One idea each."),
        CHAL(),
        Q("Which is clearer?",["The skip is full. Please book another one.","The skip which is full and which I noticed earlier is now in a state that means another needs booking.","Skip full book another please now.","Skip."],"Short, complete sentences."),
        T("Reading your work aloud helps you spot mistakes.",true,"You hear missing words.")
      ]),
      lesson("e2-purpose","Writing for different purposes and audiences","Tone, format and who’s reading",[
        TE("Who and why","Ask *who* will read it and *why*. A note to a workmate can be informal; a letter to a customer or your assessor should be formal."),
        S("Formal or informal?",["Formal","Informal"],[["A letter to a customer",0,"Polite and formal."],["A text to a workmate",1,"Friendly is fine."],["A report for your assessor",0,"Formal and detailed."],["A note on the cabin fridge",1,"Informal."]]),
        Q("Writing to a customer about a delay. Which opening fits?",["Dear Mrs Patel,","Hiya!","Oi,","To whoever,"],"Dear and their name."),
        TE("Persuading","Persuasive writing uses *reasons and evidence*, like time and money saved."),
        CHAL(),
        Q("Which would persuade a manager to buy a new tool?",["Show how it saves time and money, with figures","Say you really want it","Say everyone else has one","Just order it"],"Reasons and evidence."),
        T("The same message can need different wording for different readers.",true,"Change the tone.")
      ]),
      lesson("e2-email","Emails and workplace communication","Clear, polite and to the point",[
        TE("A good work email","A clear *subject line*, a greeting, why you’re writing in the first line, one topic, and a polite sign-off with your name.","email"),
        Q("In this email, what’s the job of the first line after the greeting?",["Say why you’re writing","Say who you are","Sign off","Give the date"],"The reader knows the point straight away.",{pic:"email"}),
        Q("Which is the best subject line?",["Delivery for 14 High St on Friday","Hi","Important!!!","Stuff"],"It says what it’s about."),
        O("Put the parts of an email in order",["Subject line","Greeting","Why you’re writing","Details","Sign-off and name"],"The point is clear by line one."),
        CHAL(),
        Q("Which sign-off suits a work email?",["Kind regards, Sam","Luv Sam xx","Laters","Bye bye"],"Keep it professional."),
        T("Capital letters in an email can come across as shouting.",true,"Use normal sentences.")
      ]),
      lesson("e2-report","Reports and formal writing","Structure, headings and facts",[
        TE("A report","A title, a short introduction, *headings* for each section, facts in a logical order, then a conclusion and recommendations."),
        O("Put a report in order",["Title","Introduction","Findings under headings","Conclusion","Recommendations"],"Readers can jump to what they need."),
        J("Right for a formal report?",[["Two bricks on the third course were cracked and have been replaced.",true,"Factual and precise."],["Loads of bricks were smashed lol.",false,"Slang."],["Honestly the wall was a disaster.",false,"Opinion, informal."],["The work was completed on 12 May.",true,"Factual."]]),
        CHAL(),
        Q("What goes in the conclusion?",["A summary of what you found","A new topic","Jokes","Your contact list"],"Sum up."),
        T("Headings make a report easier to read.",true,"They break it into sections.")
      ]),
      lesson("e2-instruct","Instructions and explanations","Steps in order, one action each",[
        TE("Instructions","Number the steps. Start each with a *verb* (Check, Fit, Measure). One action per step. Safety warnings go *before* the step they apply to."),
        O("Put these instructions in order",["Wear gloves and eye protection","Measure and mark the cut","Clamp the board","Make the cut","Sand the edge"],"Safety first."),
        Q("Which is the best instruction?",["Check the frame is plumb with a spirit level.","The frame should, if possible, be looked at in terms of plumbness.","Plumb frame.","Do the frame thing."],"Starts with a verb, says exactly what."),
        TE("Explanations","An explanation says *how or why* something happens, not just what to do."),
        CHAL(),
        Q("Where should a safety warning go?",["Before the step it applies to","After the last step","At the end","It isn’t needed"],"Before the risky step."),
        B("Build the instruction","Check the frame is plumb",["maybe","should"],"Start with a verb.")
      ])
    ],fs),
    unit("Speaking and listening","",[
      lesson("e2-speak","Speaking and listening","Clear speaking and active listening",[
        TE("Speaking and listening","Speak clearly at a steady pace. Listen *actively*: face the speaker, don’t interrupt, and sum up or ask to check you’ve understood.","team"),
        M("Match the skill to an example",[["Active listening","Nodding and summing up"],["Clarifying","“Do you mean the left-hand door?”"],["Body language","Facing the speaker, not your phone"],["Clear speaking","Steady pace, no mumbling"]],"Good communication."),
        SC("Unclear instructions","Your supervisor gives instructions you don’t fully understand.","What do you do?",[["Ask a question to check","Avoids mistakes."],["Nod and guess","You might get it wrong."],["Ask someone else later","The right person is here now."]]),
        CHAL(),
        Q("Which question checks understanding best?",["“So you want the skirting in the hall first?”","“Yeah?”","“What?”","“Whatever you say.”"],"Repeat back the key detail."),
        T("On a noisy site, shout instructions from far away.",false,"Get closer or step somewhere quieter.")
      ]),
      lesson("e2-discuss","Discussions and presentations","Taking part and presenting ideas",[
        TE("Discussions","Listen, take turns, build on others’ points, and disagree *politely with reasons*."),
        J("Good in a discussion?",[["“I see your point, but let’s check the drawing first.”",true,"Polite, with a reason."],["“That’s rubbish.”",false,"Rude."],["Asking a quiet colleague for their view",true,"Inclusive."],["Talking over people",false,"Shuts them out."]]),
        TE("Presentations","Plan a start, middle and end. Speak to the audience, not your notes. Invite questions."),
        O("Put a short presentation in order",["Say what you’ll talk about","Give your main points","Give an example","Sum up","Ask for questions"],"Tell them, show them, sum up."),
        CHAL(),
        Q("A colleague disagrees with your plan in a meeting. Best response?",["Ask for their reasons and weigh them up","Talk louder","Change the subject","Ignore them"],"Listen, then decide on the evidence."),
        T("Rehearse a presentation out loud first.",true,"You’ll spot bits that don’t flow.")
      ])
    ],fs)
  );
})();
