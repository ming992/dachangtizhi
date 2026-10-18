(function(root){
  'use strict';
  const D=root.AssessmentData||(typeof require==='function'?require('./data.js'):null);
  const ids=D.dimensions.map(d=>d.id);
  const clamp=n=>Math.max(0,Math.min(100,Math.round(n)));
  function normalizeAnswers(raw){
    if(!raw||typeof raw!=='object')return {};
    const clean={};
    D.questions.forEach(q=>{const value=raw[q.id];if(Number.isInteger(value)&&value>=0&&value<5)clean[q.id]=value;});
    return clean;
  }
  function score(answers){
    const a=normalizeAnswers(answers), scores={};
    D.dimensions.forEach(d=>{
      const qs=D.questions.filter(q=>q.dimension===d.id);
      const sum=qs.reduce((s,q)=>s+(a[q.id]===undefined?0:q.options[a[q.id]].score),0);
      scores[d.id]=clamp(sum/(qs.length*4)*100);
    });
    const index=clamp(scores.collab*.18+scores.change*.13+scores.structure*.17+scores.drive*.16+scores.org*.20+scores.values*.16);
    return {dimensions:scores,index};
  }
  function profileScores(s){
    return {
      grow: s.drive*.30+s.org*.25+s.values*.25+s.structure*.12+s.change*.08,
      driver:s.collab*.40+s.structure*.30+s.change*.20+s.drive*.10,
      expert:s.structure*.34+s.drive*.24+(100-s.collab)*.26+(100-s.org)*.16,
      steady:s.org*.28+s.structure*.22+(100-s.change)*.22+(100-s.values)*.28,
      autonomy:(100-s.org)*.32+s.change*.26+s.drive*.27+s.collab*.15,
      free:(100-s.values)*.36+(100-s.org)*.26+(100-s.change)*.20+(100-s.collab)*.18
    };
  }
  function rankProfiles(s){
    const p=profileScores(s);
    return D.profiles.slice().sort((a,b)=>p[b.id]-p[a.id]||D.profiles.findIndex(x=>x.id===a.id)-D.profiles.findIndex(x=>x.id===b.id));
  }
  function band(n){return n>=65?'high':n>=40?'mid':'low';}
  function explanationPool(answers,s){
    const lines=[];
    D.dimensions.forEach(d=>d[band(s[d.id])].forEach((text,i)=>lines.push({key:`${d.id}-${band(s[d.id])}-${i}`,dimension:d.id,text,source:'dimension'})));
    D.questions.forEach(q=>{
      const points=q.options[answers[q.id]].score;
      if(points>=3)lines.push({key:`${q.id}-positive`,dimension:q.dimension,text:q.signals.positive,source:q.tag});
      if(points<=1)lines.push({key:`${q.id}-negative`,dimension:q.dimension,text:q.signals.negative,source:q.tag});
      if(points===2)lines.push({key:`${q.id}-context`,dimension:q.dimension,text:q.reason,source:q.tag});
    });
    return lines;
  }
  function environmentScores(s){return [
    {name:'大型成熟企业',score:clamp(s.org*.42+s.collab*.18+s.structure*.20+s.values*.20),reason:'适合度主要受流程、资源与跨团队协作偏好影响。'},
    {name:'中型成长企业',score:clamp(58+s.structure*.16+s.drive*.14+s.collab*.12-s.org*.10),reason:'兼顾分工与灵活度，值得考察具体授权方式。'},
    {name:'创业团队',score:clamp((100-s.org)*.40+s.change*.27+s.drive*.20+s.collab*.13),reason:'决策速度和试验空间较高，同时要确认资源支持。'},
    {name:'专业型小团队',score:clamp((100-s.collab)*.25+s.structure*.30+s.drive*.23+(100-s.org)*.22),reason:'专业判断与独立交付空间可能更充足。'},
    {name:'高自主工作环境',score:clamp((100-s.org)*.30+(100-s.values)*.28+s.drive*.23+(100-s.collab)*.19),reason:'自主安排是优势，需同时确认反馈与成果标准。'}
  ].sort((a,b)=>b.score-a.score);}
  function roleSuggestions(s){
    return [
      {name:'产品',score:clamp(s.collab*.27+s.structure*.26+s.drive*.27+s.change*.20),why:'需要理解需求、拆解问题并协调不同角色。'},
      {name:'运营',score:clamp(s.change*.30+s.collab*.27+s.structure*.23+s.drive*.20),why:'适合关注反馈、节奏变化与跨团队执行。'},
      {name:'技术',score:clamp(s.structure*.36+s.drive*.35+(100-s.collab)*.19+s.change*.10),why:'可探索有专业深度与明确交付的技术方向。'},
      {name:'设计',score:clamp(s.drive*.32+s.structure*.27+(100-s.org)*.21+s.collab*.20),why:'适合以作品、用户问题和迭代验证形成影响。'},
      {name:'数据分析',score:clamp(s.structure*.46+s.drive*.27+(100-s.change)*.15+s.collab*.12),why:'适合处理复杂信息、形成可验证的判断。'},
      {name:'项目管理',score:clamp(s.collab*.39+s.structure*.35+s.change*.26),why:'需要依赖管理、沟通与阶段交付。'},
      {name:'职能支持',score:clamp(s.org*.32+s.structure*.31+s.collab*.24+(100-s.change)*.13),why:'适合重视制度、服务与稳定协作的方向。'}
    ].sort((a,b)=>b.score-a.score);
  }
  const planTemplates=[
    ['写下三个理想工作关键词','从最近一次让你有能量的任务里找证据','15 分钟'],
    ['回顾一次满意的交付','记录你的贡献、协作方式和结果','20 分钟'],
    ['盘点一个真实摩擦点','区分任务问题、管理问题与环境问题','20 分钟'],
    ['查阅两个岗位描述','标记重复出现的职责与能力要求','25 分钟'],
    ['写出工作边界','列出可协商与不可协商的时间安排','15 分钟'],
    ['整理一段成果故事','用背景、行动、结果写成 150 字','25 分钟'],
    ['设定一个月目标','选择一个能通过作品或案例验证的目标','20 分钟'],
    ['访谈一位从业者','询问真实协作、反馈和工作节奏','30 分钟'],
    ['比较两种组织环境','写下各自吸引与消耗你的地方','20 分钟'],
    ['做一次技能小练习','围绕目标岗位完成一个可展示的小任务','35 分钟'],
    ['更新简历一条经历','加入具体行动与可核实的结果','25 分钟'],
    ['查看岗位职责边界','找出描述中模糊的责任表述','20 分钟'],
    ['练习一次优先级协商','写出范围、时间、质量的取舍方案','20 分钟'],
    ['给自己一次反馈','记录本周做得好的一件事和一处改进','15 分钟'],
    ['筛选三个真实岗位','按必备条件与偏好条件分开标注','30 分钟'],
    ['搭建作品资料夹','存放项目截图、文档和复盘证据','25 分钟'],
    ['准备两个面试反问','根据你的核心环境偏好改写问题','20 分钟'],
    ['练习跨团队表达','用三句话说清目标、依赖和待决事项','15 分钟'],
    ['核算机会的时间成本','估算通勤、制度和额外投入','20 分钟'],
    ['寻找一个可请教的人','提出一个具体而简短的问题','20 分钟'],
    ['做一页项目复盘','记录目标、关键选择、结果与下一步','30 分钟'],
    ['确认学习资源','比较导师、课程、项目机会是否真实可用','20 分钟'],
    ['模拟绩效沟通','为一条抽象评价准备追问与证据','20 分钟'],
    ['试做一项岗位任务','用小样本检验兴趣与实际投入感','40 分钟'],
    ['优化个人介绍','说清你的长处、偏好和正在练习的能力','20 分钟'],
    ['评估团队支持','整理面试中仍未得到答案的问题','20 分钟'],
    ['做一次机会对比','写下权重、底线和需要核实的条件','25 分钟'],
    ['安排恢复时间','把可持续节奏写入下周日程','10 分钟'],
    ['复核成长证据','比较第 1 天与今天的判断变化','20 分钟'],
    ['决定下一步行动','选择申请、访谈、练习或等待的具体日期','20 分钟']
  ];
  function growthPlan(profile,s){
    return planTemplates.map((row,i)=>({day:i+1,title:row[0],step:row[1]+(i===6?`；重点练习「${D.dimensions.slice().sort((a,b)=>s[a.id]-s[b.id])[0].short}」。`:'。'),time:row[2],goal:i<7?'认识自己':i<15?'探索机会':i<23?'积累证据':'做出选择'}));
  }
  function signalsForDimension(pool,id){return pool.filter(x=>x.dimension===id&&x.source!=='dimension').slice(0,2);}
  function generate(answers,nickname='',date=new Date().toISOString()){
    const a=normalizeAnswers(answers);
    if(Object.keys(a).length!==30)throw new Error('请先完成全部 30 道题。');
    const {dimensions:s,index}=score(a),ordered=D.dimensions.slice().sort((x,y)=>s[y.id]-s[x.id]);
    const ranked=rankProfiles(s),primary=ranked[0],secondary=ranked[1],pool=explanationPool(a,s);
    const strengths=ordered.slice(0,3).map(d=>({title:d.name,score:s[d.id],text:d[band(s[d.id])][0],evidence:signalsForDimension(pool,d.id)[0]?.text||d[band(s[d.id])][1]}));
    const frictions=ordered.slice(-3).reverse().map(d=>({title:d.name,score:s[d.id],text:d[band(s[d.id])][1],action:d[band(s[d.id])][2]}));
    const variation=ids.filter(id=>{const qs=D.questions.filter(q=>q.dimension===id).map(q=>q.options[a[q.id]].score);return Math.max(...qs)-Math.min(...qs)>=4;});
    const nuance=[];
    if(s.drive>=65&&s.collab<=40)nuance.push('你愿意投入成长，也很在意专注空间；专业深耕通道可能比高频协调岗位更合拍。');
    if(s.org>=65&&s.values<=40)nuance.push('你喜欢制度清楚，同时重视生活或自主条件；可以重点考察制度是否真正保护边界。');
    if(s.collab>=65&&s.change<=40)nuance.push('你愿意与多人合作，但需要更稳定的目标和变更机制。');
    if(variation.length)nuance.push(`你在「${D.dimensions.find(d=>d.id===variation[0]).name}」的不同情境中选择有所变化，这可能说明你会看具体任务和支持条件。`);
    if(!nuance.length)nuance.push(`你的选择在「${ordered[0].name}」上较集中；实际体验仍会随团队文化和个人阶段改变。`);
    const custom=`${ordered[0].short}是你当前最突出的方向；面对${ordered[5].short}相关情境时，你可能更需要合适的支持与选择空间。`;
    return {version:1,id:`r-${Date.parse(date)||0}-${Object.values(a).join('')}`,date,nickname:String(nickname||'探索者').trim().slice(0,20),answers:a,scores:s,index,primary:primary.id,secondary:secondary.id,profile:primary,secondaryProfile:secondary,profileRanking:ranked.map(p=>p.id),strengths,frictions,nuance,custom,explanations:pool,environments:environmentScores(s),roles:roleSuggestions(s),plan:growthPlan(primary,s),shareLines:D.shareLines[primary.id]};
  }
  const api={normalizeAnswers,score,profileScores,rankProfiles,band,explanationPool,environmentScores,roleSuggestions,growthPlan,generate,planTemplates};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.AssessmentEngine=api;
})(typeof window!=='undefined'?window:globalThis);
