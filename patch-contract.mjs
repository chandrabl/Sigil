import fs from 'fs';

let content = fs.readFileSync('managed/auction/contract/index.js', 'utf8');

// Pattern: return { result: result_N, context: context, proofData: partialProofData, gasCost: context.gasCost };
// We push a trace entry before returning, so the new SDK's ContractExecutable can read it.
const traceBlock = `// Push to callProofDataTrace for new SDK (v0.19+) compatibility
        if (contextOrig_0 && Array.isArray(contextOrig_0.callProofDataTrace)) {
          const _cc = context.callContext || contextOrig_0.callContext;
          const _qc = _cc ? _cc.currentQueryContext : (context.currentQueryContext || contextOrig_0.currentQueryContext);
          contextOrig_0.callProofDataTrace.push({
            circuitId: _cc ? _cc.circuitId : '__call__',
            contractAddress: _cc ? _cc.contractAddress : '',
            finalQueryContext: _qc,
            publicTranscript: partialProofData.publicTranscript,
            input: partialProofData.input,
            output: partialProofData.output,
            privateTranscriptOutputs: partialProofData.privateTranscriptOutputs,
            commCommData: null
          });
        }
        `;

const before = content;
content = content.replace(
  /return \{ result: (result_\d+), context: context, proofData: partialProofData, gasCost: context\.gasCost \};/g,
  `${traceBlock}return { result: $1, context: context, proofData: partialProofData, gasCost: context.gasCost };`
);

const count = (content.match(/Push to callProofDataTrace/g) || []).length;
console.log(`Patched ${count} circuit return(s)`);

if (content !== before) {
  fs.writeFileSync('managed/auction/contract/index.js', content);
  console.log('Written OK');
} else {
  console.log('No changes made');
}
