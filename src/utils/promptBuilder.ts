export function createPrompt(context: EditorContext): string {
    const {previousContext, currentSentence, followingContext} = context;

    return `
<purpose>
  You are an expert writing assistant, help the user complete the sentence that is in the <current_sentence> tag.
</purpose>

<instructions>
  <instruction>
    Do not include any formatting or quotes in your response.
  </instruction>
  <instruction>
    Only respond with at most ONE sentence.
  </instruction>
  <instruction>
    Keep your response concise and to the point, do not include any additional information.
  </instruction>
  <instruction>
    Make sure that your response is coherent with the <previous_context> and <following_context>.
  </instruction>
</instructions>

<content>
  <previous_context>
    ${previousContext}
  </previous_context>

  <following_context>
    ${followingContext}
  </following_context>

  <current_sentence>
    ${currentSentence}
  </current_sentence>
</content>

<instructions>
  <instruction>
    Predict the next few words of the <current_sentence> based on the <previous_context> and <following_context>.
  </instruction>
  <instruction>
    Never repeat a sentence that is in the <previous_context>.
  </instruction>
</instructions>

Continuation:`;
} 