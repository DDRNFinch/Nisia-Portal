/* Teach me: equality, diversity and inclusion (EDI), safeguarding, Prevent, British values, wellbeing and apprentice
   rights, for every course. Built on the Equality Act 2010 and the rules providers teach to, with site examples. Like maths and English, it doesn't log off-the-job time. */
(function(){
  const {TE,CD,Q,T,M,O,G,S,J,SC,CHAL,lesson,unit}=window.EVIA_TEACH,edi={fs:"edi"};
  window.EVIA_TEACH.fs.push(
    unit("Equality, diversity and inclusion","",[
      lesson("edi-what","What EDI means","Equality, diversity and inclusion at work",[
        CD("Three words",[["Equality","Equality","Everyone treated fairly and given the same chances"],["Diversity","Diversity","Valuing the ways people are different"],["Inclusion","Inclusion","Everyone feels welcome and can take part"]]),
        TE("Why it matters on site","A crew that treats everyone fairly works *safer* and *better*: people speak up about problems, and good workers stay. The *Equality Act 2010* makes fair treatment the law.","team"),
        M("Match the word to an example",[["Equality","The same pay and training for the same job"],["Diversity","A crew of different ages and backgrounds"],["Inclusion","Asking the quiet new starter what they think"]],"Fair chances, valuing differences, everyone taking part."),
        CHAL(),
        Q("Which law protects people from discrimination at work in Great Britain?",["The Equality Act 2010","The Health and Safety at Work Act 1974","The Building Regulations","The Data Protection Act 2018"],"The Equality Act 2010."),
        T("Fair treatment matters in the office, but not on site.",false,"It applies to every workplace, site included.")
      ]),
      lesson("edi-protected","Protected characteristics","The nine things the law protects",[
        TE("Nine protected characteristics","It’s against the law to treat you unfairly because of your *age*, *disability*, *gender reassignment*, *marriage or civil partnership*, *pregnancy and maternity*, *race*, *religion or belief*, *sex* or *sexual orientation*."),
        J("Is it a protected characteristic?",[["Age",true,"Young or old."],["Religion or belief",true,"Having no religion counts too."],["The football team you support",false,"Not protected."],["Disability",true,"It can include hidden conditions."],["Your taste in music",false,"Not protected."]],["Protected","Not protected"]),
        TE("What they cover","*Race* includes colour, nationality and ethnic or national origin. *Disability* can include hidden conditions, like diabetes or some mental health conditions, when they have a big, long-term effect on everyday life."),
        CHAL(),
        Q("How many protected characteristics are there?",["Nine","Five","Twelve","Three"],"Nine, all in the Equality Act 2010."),
        G("Treating someone unfairly because of a protected characteristic is called [discrimination].",["promotion","appraisal"],"That’s discrimination.")
      ]),
      lesson("edi-types","Types of discrimination","Direct, indirect, harassment and victimisation",[
        CD("Four kinds",[["Direct","Direct discrimination","Treating someone worse because of who they are"],["Indirect","Indirect discrimination","A rule for everyone that puts one group at a disadvantage, with no good reason"],["Harassment","Harassment","Unwanted behaviour linked to who someone is, that upsets, humiliates or intimidates them"],["Victimisation","Victimisation","Treating someone badly because they complained, or backed up a complaint"]]),
        S("Which kind is it?",["Direct","Indirect","Harassment","Victimisation"],[["Not offering a woman a site job because she’s a woman",0,"Worse treatment because of her sex."],["A rule that everyone works every Saturday, with no real need, which rules out some faiths",1,"The same rule for all, but unfair on one group."],["Jokes about a colleague’s religion that humiliate him",2,"Unwanted and linked to his religion."],["Leaving someone off overtime because they reported harassment",3,"Punished for complaining."]]),
        CHAL(),
        T("If you didn’t mean to offend, it can’t be harassment.",false,"What counts is the effect on the person, not what you meant."),
        Q("A new starter reports racist comments and then gets all the worst jobs. What is that?",["Victimisation","Indirect discrimination","Fair treatment","Positive action"],"Being punished for complaining is victimisation.")
      ]),
      lesson("edi-banter","Banter or bullying?","Respect on site and speaking up",[
        TE("Where banter stops","Banter is fine when *everyone’s* laughing. It crosses the line when it’s aimed at one person, keeps happening, or picks on who they are.","team"),
        J("Fine, or over the line?",[["A joke the whole crew is in on, including the person it’s about",true,"Everyone’s laughing."],["A nickname about someone’s accent or skin colour",false,"Linked to race: harassment."],["Copying the way a colleague with a stammer speaks",false,"Picking on a disability."],["Wolf-whistling at someone walking past the site",false,"Sexual harassment."]],["Fine","Over the line"]),
        O("If you see someone being picked on",["Check it’s safe to step in","Ask them to stop, or help the person away","Check the person is OK afterwards","Report it to your supervisor, site manager or training provider"],"Act if it’s safe, support, then report."),
        SC("A workmate’s jokes","A workmate keeps making jokes about a new labourer’s religion. The labourer laughs along but looks uncomfortable.","What do you do?",[["Speak up or report it, and check the labourer is OK","Laughing along doesn’t mean it’s welcome."],["Nothing, he’s laughing","He may feel he has to."],["Join in so you fit in","Then you’re part of it."]]),
        CHAL(),
        Q("As an apprentice, who can you report discrimination to?",["Your supervisor, site manager, HR or your training provider","No one: you just put up with it","Only the police","Only your workmates"],"You have lots of people to go to, including your tutor or assessor."),
        T("An employer can be held responsible for harassment by its staff.",true,"So employers must take it seriously.")
      ]),
      lesson("edi-include","Making work inclusive","Reasonable adjustments and fair choices",[
        TE("Reasonable adjustments","Employers must make *reasonable adjustments* so disabled workers aren’t held back: instructions read out as well as written, extra time in tests, or a flashing or vibrating fire alarm for someone who’s deaf. The government’s *Access to Work* scheme can help pay."),
        J("A reasonable adjustment?",[["Coloured overlays and extra time for a dyslexic apprentice",true,"Helps them show what they know."],["A vibrating pager alarm for a deaf worker",true,"They’ll know when to get out."],["Refusing to explain a drawing a second time",false,"That’s just unhelpful."],["Telling someone to keep their condition quiet",false,"That isn’t support."]],["Yes","No"]),
        TE("Snap judgements","Everyone makes snap judgements about people, often without noticing. Catch yourself, and judge people on their *skills and work*, not their age, sex or background."),
        Q("A 50-year-old starts an apprenticeship. Someone says they’re too old to learn. That comment is…",["Age discrimination","Fair comment","Just banter","Good advice"],"Age is protected, and anyone can learn a trade."),
        CHAL(),
        SC("A new apprentice","A new apprentice has diabetes and asks for short breaks to check their blood sugar.","What should the employer do?",[["Allow the breaks as a reasonable adjustment","A small change that keeps them safe at work."],["Refuse: breaks are breaks","That could be disability discrimination."],["Tell them to find another job","That’s discrimination."]]),
        T("Inclusion means giving everyone exactly the same, whatever they need.",false,"Sometimes fair means different support, like reasonable adjustments.")
      ])
    ],edi),
    unit("Safeguarding and Prevent","",[
      lesson("edi-safe","Safeguarding","Keeping yourself and others safe from harm",[
        TE("What safeguarding means","Safeguarding means protecting people from *harm, abuse and neglect*. Your training provider has a *Designated Safeguarding Lead* (DSL) whose job is to help if you, or someone you know, isn’t safe.","team"),
        O("Someone tells you they’re being hurt. Put what you do in order",["Listen and stay calm","Tell them you have to pass it on to keep them safe","Tell the DSL or your tutor straight away","Write down what they said, in their words"],"Listen, don’t promise secrecy, report fast, record it."),
        J("Right thing to do?",[["Promise to keep it a secret",false,"You can’t: you have to pass it on to keep them safe."],["Ask lots of questions to find out exactly what happened",false,"Leave that to the DSL. Just listen."],["Report it the same day",true,"Quickly is safest."],["Call 999 if someone’s in danger right now",true,"Emergencies come first."]],["Do","Don’t"]),
        CHAL(),
        Q("Who at your training provider should you go to with a safeguarding worry?",["The Designated Safeguarding Lead (DSL)","Whoever’s nearest","Nobody, sort it out yourself","Only the police"],"The DSL, or any tutor who’ll pass it on."),
        T("Safeguarding only covers people under 18.",false,"Adults can be at risk too, and it covers everyone.")
      ]),
      lesson("edi-abuse","Abuse and exploitation","Spotting the signs and getting help",[
        CD("Kinds of harm",[["Physical","Physical abuse","Hurting someone’s body"],["Emotional","Emotional abuse","Threats, put-downs and control that damage someone’s wellbeing"],["Neglect","Neglect","Not meeting someone’s basic needs, like food, warmth or care"],["Financial","Financial abuse","Taking or controlling someone’s money"],["Exploitation","Criminal exploitation","Being pressured or tricked into crime, like carrying drugs for a gang (county lines)"],["Modern slavery","Modern slavery","Being forced to work for little or no pay, often with ID taken away"]]),
        S("Which kind of harm?",["Exploitation","Modern slavery","Financial"],[["An older lad offers you cash to drop off parcels after work",0,"A common way into county lines."],["A labourer’s passport is kept by his gangmaster, who takes most of his pay",1,"Signs of modern slavery."],["A partner takes your wages and gives you ‘pocket money’",2,"Controlling someone’s money."]]),
        TE("Signs to look out for","Someone who suddenly has new expensive things, seems scared of a boss or ‘friend’, always has someone speaking for them, or has no ID or money of their own may need help. You don’t need proof: *tell the DSL*."),
        CHAL(),
        Q("A workmate says a gangmaster holds his passport and he can’t leave. What do you do?",["Tell your supervisor or the DSL, or call the Modern Slavery Helpline","Mind your own business","Ask the gangmaster about it","Post about it online"],"Pass it on to someone who can act."),
        T("You need proof before you report a worry.",false,"Report what you’ve seen or heard. Others will look into it.")
      ]),
      lesson("edi-prevent","Prevent","Radicalisation, extremism and what to do",[
        TE("What Prevent is","*Prevent* is part of the UK’s counter-terrorism strategy. It aims to stop people being drawn into terrorism or supporting it, by spotting worries early and getting people support."),
        TE("Radicalisation","*Radicalisation* is when someone is drawn into extremist views that can lead to hatred or violence. It often happens online, and anyone can be targeted, especially when they feel lonely, angry or left out."),
        J("A possible sign of radicalisation?",[["Suddenly cutting off friends and family",true,"Isolation is a common sign."],["Sharing videos that praise violence against a group",true,"A serious warning sign."],["Supporting a different football team",false,"Just a difference of opinion."],["Talking as if violence is the only answer",true,"A warning sign."]],["Worrying","Not worrying"]),
        O("If you’re worried someone’s being radicalised",["Notice what worries you","Don’t argue or investigate yourself","Tell the DSL or your tutor","They decide on support, which is voluntary"],"Prevent is about support, not punishment."),
        CHAL(),
        Q("You see terrorist material online. What should you do?",["Report it, for example on GOV.UK’s ‘report online terrorist material’ page","Share it to warn people","Ignore it","Comment on it"],"Report it, never share it."),
        T("A referral to Prevent means someone gets arrested.",false,"It’s about getting early support. Most people who are referred get help, not a criminal record.")
      ]),
      lesson("edi-online","Staying safe online","Scams, sharing and your digital footprint",[
        J("Safe or risky?",[["Using a different strong password for each account",true,"One leak won’t open everything."],["Clicking a text link saying your parcel needs a fee",false,"A common scam."],["Posting photos from site without permission",false,"It could break site rules or show hazards."],["Turning on two-step verification",true,"Much harder to hack."]],["Safe","Risky"]),
        TE("Think before you post","What you post stays around. Employers do look. Don’t share anything that’s hateful, private, or from a site without permission. If someone threatens you or asks for images, *don’t pay or reply*. Save the evidence and tell someone."),
        SC("A threatening message","Someone online says they’ll share private photos of you unless you pay.","What do you do?",[["Don’t pay, save the messages and tell someone you trust or the police","Paying rarely stops it, and help is available."],["Pay them quickly","They usually ask for more."],["Delete everything and say nothing","You lose the evidence and carry it alone."]]),
        CHAL(),
        Q("Which is the strongest password?",["A long phrase of four random words","Your name and birth year","password123","The same one you use everywhere"],"Long and random is best."),
        T("If you’re under 18, you can report online grooming or abuse to CEOP.",true,"CEOP is the police’s child protection team.")
      ])
    ],edi),
    unit("British values","",[
      lesson("edi-values","The British values","Democracy, law, liberty, respect and tolerance",[
        CD("Five values",[["Democracy","Democracy","Everyone gets a say, usually by voting, and decisions go with the majority"],["Rule of law","The rule of law","Laws apply to everyone equally, and protect us"],["Liberty","Individual liberty","Freedom to make your own choices, within the law"],["Respect","Mutual respect","Treating others as you’d want to be treated"],["Tolerance","Tolerance","Accepting people with different faiths and beliefs, or none"]]),
        M("Match the value to an example",[["Democracy","The crew votes on the Christmas do"],["The rule of law","Site rules and the law apply to the boss too"],["Individual liberty","Choosing your own religion, or none"],["Tolerance","Making room for a colleague to pray at break"]],"Each value in everyday life."),
        CHAL(),
        Q("Which of these is NOT one of the British values?",["Always agreeing with your manager","Democracy","The rule of law","Mutual respect"],"You can disagree respectfully."),
        T("Individual liberty means you can do anything you like.",false,"Your freedom stops where it harms others or breaks the law.")
      ]),
      lesson("edi-values-work","British values at work","What they look like on site",[
        TE("On site","*Toolbox talks* where everyone can speak up are democracy. *Following health and safety law* is the rule of law. *Choosing your trade and your path* is liberty. *Treating every trade and every person with respect* is respect and tolerance.","team"),
        S("Which value is it?",["Democracy","Rule of law","Respect and tolerance"],[["Everyone gets a vote on the new break rota",0,"A fair say for all."],["Wearing your harness because the law and site rules require it",1,"Rules apply to everyone."],["Not mocking a colleague’s accent or faith",2,"Respecting differences."]]),
        SC("A heated debate","Two workmates are arguing about politics at break, and it’s getting personal.","What helps most?",[["Suggest they respect each other’s views and change the subject","You can disagree without being disrespectful."],["Take a side and join in","That makes it worse."],["Film it for a laugh","That’s disrespectful and could be bullying."]]),
        CHAL(),
        Q("A new starter’s faith means they don’t drink. What shows tolerance?",["Plan a team social that everyone can enjoy","Tell them they have to drink to fit in","Leave them out of socials","Make jokes about it"],"Include everyone."),
        T("Voting in elections is one way to take part in democracy.",true,"Your vote is your say in who makes the laws.")
      ])
    ],edi),
    unit("Wellbeing and your rights","",[
      lesson("edi-wellbeing","Mental health and wellbeing","Looking after yourself and your mates",[
        TE("Why it matters in construction","Construction has one of the highest suicide rates of any industry. Long days, working away and money worries all add up. *Talking helps*, and asking a mate if they’re OK really can make a difference.","team"),
        J("A sign someone might be struggling?",[["Suddenly quiet and withdrawn",true,"A change in behaviour is worth noticing."],["Turning up late and not caring about the job",true,"Could be a sign."],["Drinking a lot more than usual",true,"Often a way of coping."],["Being in a good mood on a Friday",false,"Perfectly normal."]],["Worth checking","Normal"]),
        O("If a mate seems to be struggling",["Find a quiet moment","Ask how they are, and ask twice","Listen without judging","Help them find support"],"Ask, listen, point them to help."),
        TE("Where to get help","Talk to your GP, your supervisor, your tutor or your provider’s support team. The *Lighthouse Construction Industry Charity* has a free 24/7 helpline (0345 605 1956), and *Samaritans* answer day and night on 116 123. If someone’s life is in danger, call 999."),
        CHAL(),
        Q("Which number reaches Samaritans, free, day or night?",["116 123","999","101","111"],"116 123. (111 is NHS advice, 101 is non-emergency police.)"),
        T("Asking someone directly if they’re thinking about suicide puts the idea in their head.",false,"It doesn’t. Asking directly can open the door to help.")
      ]),
      lesson("edi-rights","Your rights as an apprentice","Pay, time, safety and support",[
        TE("Your agreement","You have an *apprenticeship agreement* with your employer and a *commitment statement* that sets out your training, including your off-the-job hours. Off-the-job training is *paid working time*."),
        J("True for apprentices?",[["You’re paid at least the minimum wage rate for apprentices",true,"The apprentice rate applies if you’re under 19 or in your first year. After that, it’s the rate for your age."],["Off-the-job training happens in your own unpaid time",false,"It’s part of your paid hours."],["Your employer must give you the PPE you need, free",true,"It’s the law."],["You get no paid holiday until you qualify",false,"You get paid holiday from the start."]],["True","False"]),
        TE("Holidays and hours","Full-time workers get at least *28 days’ paid holiday* a year, which can include bank holidays. If you’re under 18, there are extra limits on your working hours and breaks."),
        CHAL(),
        Q("Your off-the-job training keeps getting cancelled for site work. What do you do?",["Talk to your employer, then your tutor or training provider","Put up with it","Quit the apprenticeship","Do it all at weekends unpaid"],"Your provider can help sort it out."),
        SC("Asked to do something unsafe","Your supervisor asks you to work at height without the right equipment.","What do you do?",[["Say no politely, explain why, and report it","You have the right to refuse unsafe work."],["Do it quickly so no one notices","It could cost your life."],["Walk off site without saying anything","Speak up so it gets fixed."]])
      ])
    ],edi)
  );
})();
