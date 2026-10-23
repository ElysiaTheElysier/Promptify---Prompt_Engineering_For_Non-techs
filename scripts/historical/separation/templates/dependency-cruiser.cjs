module.exports={
 forbidden:[
  {name:'no-unresolved-source',severity:'error',from:{},to:{couldNotResolve:true}},
  {name:'app-local-source-only',severity:'error',from:{path:'^(src|api)/'},to:{pathNot:'^(src|api|node_modules)/',dependencyTypesNot:['core']}},
  {name:'no-circular',severity:'warn',from:{},to:{circular:true}}
 ],
 options:{doNotFollow:{path:'node_modules'},tsPreCompilationDeps:true,tsConfig:{fileName:'tsconfig.json'},enhancedResolveOptions:{extensions:['.ts','.tsx','.js','.json','.css'],conditionNames:['import','require','node','default']}}
};
