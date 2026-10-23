import React from 'react';
/** SVG is generated and escaped by the authorized server renderer; never accept raw user markup. */
export default function CertificatePreview({svg,title}:{svg:string;title:string}){
 return <div role="img" aria-label={title} style={{width:'100%',aspectRatio:'297 / 210'}} dangerouslySetInnerHTML={{__html:svg.replace('<svg ','<svg style="width:100%;height:100%" ')}}/>;
}
