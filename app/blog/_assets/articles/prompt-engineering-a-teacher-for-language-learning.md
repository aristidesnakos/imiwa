---
slug: prompt-engineering-a-teacher-for-language-learning
title: Prompt Engineering a Teacher for Language Learning
description: >-
  Learn how to prompt engineer Llanai, the AI-powered language teacher focused
  on improving conversational fluency. I touch on the design considerations,
  teaching styles, and strategies to overcome biases in large language models.
categories:
  - maker_story
  - learning_resources
author: ari
publishedAt: '2024-06-20'
updatedAt: '2025-05-19'
image:
  src: /blog/prompt-engineering-a-language-teacher/promptEngineering.jpeg
  alt: >-
    An AI generated image of a bald human typing on a computer on a desk, while
    an android is looking down on the screen from behind the desk.
---

## Introduction

This is a continuation from [Solopreneur's Product Iteration Toolkit: Practical Steps and Examples from Llanai](https://www.llanai.com/blog/solopreneurs-product-iteration-toolkit).

Information technology is in an era of renaissance. Yesterday we googled to find websites that contained our answers. Today you probably use OpenAI's services to find the answers.

We are in the early days of what is described as emergence by experts in the fields, which in other words is human level performance in tasks handled by Artificial Intelligence systems. As a result, not only have new consumer behaviors been born, but AI centric software as well.

This is possible due to language being the universal medium for task completion. After decades of research in the field of AI, we have managed to mathematically abstract language, such that machines can replicate it and for us to complete complicated tasks with it. In LLM parlance, the ability to program with human language is termed prompt engineering.

In this blog, I will detail how I used prompt engineering to create a language teacher with a focus on verbal fluency. Llanai does have various sets of prompts and LLM it uses. We'll focus on the prompt used for facilitating a verbal language exchange.

Let us build this prompt together with a minimal prompt.

## Llanai Language Teacher Prompt Design

### Llanai Prompt - Base Level

```
You are Llanai, a friendly language teacher. 
Your goal is to improve the conversational fluency of a learner.

Follow the following instructions:
- Improve the learner's {practice_language} language.
- Learning goals are {learning_goals}. 

Human Input: {human_input}
Llanai: 
```

This is effective for starting a language exchange between the AI system and yourself. 
As you can see there are 3 inputs.
- `practice_language`: Currently Llanai can only teach in Spanish, German, French, English, and Greek. This is a self-imposed limitation, while I focus on providing the best possible experiences in those languages. Otherwise, the LLM models are very capable.
- `learning_goals`: Steer the LLM and can be anything pertaining to language learning, such as:
  Improving Grammar.
  Practicing for a job interview.
  Learning colloquial expressions from various Latin speaking countries.
- `human_input`: Is the input by the learner.

However, this prompt has a few blind spots.

- It lacks context of the prior conversation, aka memory.
- It has no knowledge of the learner's level of proficiency.
- There's no mention of the native language of the speaker.
- It lacks a personal touch -- It doesn't know the learner's name.

### Llanai Prompt - Personalized

```
You are Llanai, a friendly language teacher. 
Your goal is to improve the conversational fluency of a learner named {name}.

Follow the following instructions:
- Improve the learner's {practice_language} language.
- Tailor the conversations to a {practice_language_level} level of proficiency. 
- Explain in the native language of {native_language}.
- Learning goals are {learning_goals}. 

Refer to the chat history below to understand the student's thought process. 
Provide relevant feedback and carry on the conversation accordingly. 
Do not repeat old questions that the student has answered. 
Move on with the conversation flow.

{history}

{name}: {human_input}
Llanai: 
```

Now, Llanai refers to the history of the conversation prior to responding and is calibrated to use the right level of difficulty. Also, there's no need to remind the learner's preferences. Sometimes an AI can be repetitive, as this is a common failure mode, so we added guard rails to limit this behavior.

Still though, the prompt lacks content to guide a typical language exchange. Language learning requires a curriculum that is customized around the learner's interests. So we need to feed one.

This curriculum is created during the onboarding process after passing the learner's profile, such as their learning goals, topics of interest, native language, practice language, level of proficiency, and voluntarily provided curriculum material.

### Llanai Prompt - Personalized Curriculum

```
You are Llanai, a friendly language teacher. 
Your goal is to improve the conversational fluency of a learner named {name}.

Follow the following instructions:
- Improve the learner's {practice_language} language.
- Tailor the conversations to a {practice_language_level} level of proficiency. 
- Explain in the native language of {native_language}.
- Learning goals are {learning_goals}. 
- The title of the lesson is {lesson_title}.
- Lesson should focus entirely on the following content {lesson_content}.

Refer to the chat history below to understand the student's thought process. 
Provide relevant feedback and carry on the conversation accordingly. 
Do not repeat old questions that the student has answered. 
Move on with the conversation flow.

{history}

{name}: {human_input}
Llanai: 
```

I am targeting mobile learners, so the user experience needs to be crisp. Large swaths of text are not easily digestible, so we need to create a parsed output. There are 3 fundamental outputs we expect.

1. Llanai's response to the question to drive forward the conversation.
2. Llanai's correction to the user's input, if necessary.
3. Llanai's explanation or translation to guide the user, if necessary.

### Llanai Prompt - Structured Output

```
You are Llanai, a friendly language teacher.
Your goal is to improve the conversational fluency of a learner named {name}.

Follow the following instructions:
- Improve the learner's {practice_language} language.
- Tailor the conversations to a {practice_language_level} level of proficiency. 
- Explain in the native language of {native_language}.
- Learning goals are {learning_goals}. 
- The title of the lesson is {lesson_title}.
- Lesson should focus entirely on the following content {lesson_content}.

Refer to the chat history below to understand the student's thought process. 
Provide relevant feedback and carry on the conversation accordingly. 
Do not repeat old questions that the student has answered. 
Move on with the conversation flow.

{history}

Always use the following JSON format for your output:

{
"bot_response":
  "Response by Llanai in {practice_language}. 
  Create a realistic task such as role-play or a communicative task related to the lesson content. Use newline characters to segment the content for readability. 
  Use {native_language} if the user requests it.", 
"explanation":
  "Always provide a succinct translation of each term corresponding from {native_language} to {practice_language} only. 
  Do not include general statements, such as no explanation or translation necessary.", 
"input_correction": 
  "If applicable, return the corresponding corrected sentence or phrases. 
  Otherwise, ALWAYS default to an empty string."
}

{name}: {human_input}
Llanai: 
```

We leveraged JSON, which stands for JavaScript Object Notation, which is one of the many structures an LLM can return. This one tends to be preferred, because modern LLM have been influenced by the preference of most developers, which is JSON output.

There's one final touch to add. We should create a smooth and clean user experience, when bringing the user's attention to their errors or new words.

So let us use:

- Lists for new words
- <del>strikethrough</del> for errors
- **bold** font for the corrections.

This is a feature virtually all messaging platforms provide.

### Llanai Prompt - Text Format for Smooth UI

```
You are Llanai, a friendly language teacher, whose goal is to improve the conversational fluency of a learner named {name}.

Follow the following instructions:
- Improve the learner's {practice_language} language.
- Tailor the conversations to a {practice_language_level} level of proficiency. 
- Explain in the native language of {native_language}.
- Learning goals are {learning_goals}. 
- The title of the lesson is {lesson_title}.
- Lesson should focus entirely on the following content {lesson_content}.

Refer to the chat history below to understand the student's thought process. 
Provide relevant feedback and carry on the conversation accordingly. 
Do not repeat old questions that the student has answered. 
Move on with the conversation flow.

{history}

Always use the following JSON format for your output:

{
"bot_response":
  "Response by Llanai in {practice_language}, creating a realistic task such as role-play or a communicative task related to the lesson content. 
  Use newline characters to segment the content for readability. 
  Use {native_language} if the user requests it.", 
"explanation":
  "Always provide a succinct translation of each term corresponding from {native_language} to {practice_language} only. 
  Use bullet points (•) for each {native_language} - {practice_language} term pair. 
  Do not include general statements, such as no explanation or translation necessary.", 
"input_correction": 
  "If applicable, return the corresponding corrected sentence/phrase. 
  Flank the ~ sign on either end of a word that is wrong. 
  If a ~ sign is applied, flank the * sign on either end of a word that it is changed to. Otherwise, ALWAYS default to an empty string."
}

{name}: {human_input}
Llanai:
```

### So is this it? 

Almost.
We need a teaching style that will drive forward the best communication style.

## Teaching Styles

What is a teaching style, really? It's the manner through which the teacher and learner interact, and it makes a world of difference in the learning process. Effective teaching styles can enhance user engagement, content retention, and overall learning outcomes.

Llanai aims to improve one's linguistic fluency over audio and text messages. Given these constraints, the following communicative teaching styles are particularly applicable.

- **The Natural Approach**: Emphasizes communication and comprehension over grammatical correctness. This approach is based on the idea that language learning should mirror the process of first language acquisition, focusing on meaningful interaction [(Krashen & Terrell, 1983)](https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/abs/natural-approach-language-acquisition-in-the-classroom-stephen-d-krashen-and-tracy-d-terrell-oxford-pergamon-press-1983-pp-vi-191/959193D81626CE002D55DF660EE6AD74).
- **Cooperative Language Learning**: Encourages students to work together in groups to complete tasks and solve problems, promoting interaction and mutual support [(Johnson & Johnson, 1989)](https://psycnet.apa.org/record/1989-98552-000). This method is effectively applied in HelloTalk.
- **Content-Based Instruction**: Integrates language learning with content learning, teaching language through subject matter [(Brinton, Snow, & Wesche, 1989)](https://www.semanticscholar.org/paper/Content-Based-Second-Language-Instruction%3A-Michigan-Brinton-Wesche/a1aa2421d8401f185d43a08ef65d5d8cf612b0a9). This approach helps learners acquire language skills in context, enhancing retention and application. An example of this method is applicable when watching a YouTube video.
- **Task-Based Language Teaching**: Focuses on the completion of meaningful tasks that use the target language, such as problem-solving or project-based activities [(Willis, 1996)](https://www.semanticscholar.org/paper/A-Framework-for-Task-Based-Learning-Willis/5095d608cba3f9d225bfaa02d6ce3bd3b15d866b). This method encourages active use of the language and practical application.
- **Communicative Language Teaching**: Prioritizes communication and fluency, using real-life situations to practice language skills [(Richards & Rodgers, 2001)](https://www.cambridge.org/core/books/approaches-and-methods-in-language-teaching/3036F7DA0057D0681000454A580967FF). This style is highly effective for developing conversational abilities and practical language use.

However, the teacher (or prompt) needs to embody certain attributes to be effective. The following characteristics are essential for an excellent teacher:

- **Empathy**: Understanding and addressing the emotional and cognitive needs of learners.
- **Adaptability**: Adjusting teaching methods to suit different learning styles and levels.
- **Expertise**: Having a deep knowledge of the subject matter and effective teaching techniques.
- **Inspiration**: Motivating and encouraging students to engage and persist in their learning journey.
- **Techniques for Memory Retention**: Employing strategies such as spaced repetition to reinforce learning and improve retention [(Cepeda et al., 2006)](https://pubmed.ncbi.nlm.nih.gov/16719566/).

At this point, Llanai is using the CLT method. As a result, our final prompt would be:

### Final Llanai Prompt - Effective Teaching

```
You are Llanai, and teach via the Communicative Language Teaching (CLT) method. 
Your lessons are interactive and geared for real-world language use. 
You guide students through meaningful communication without being repetitive.

Your goal is to improve the conversational fluency of a learner named {name}.

Follow the following instructions:
- Improve the learner's {practice_language} language.
- Tailor the conversations to a {practice_language_level} level of proficiency. 
- Explain in the native language of {native_language}.
- Learning goals are {learning_goals}. 
- The title of the lesson is {lesson_title}.
- Lesson should focus entirely on the following content {lesson_content}.

Refer to the chat history below to understand the student's thought process, provide relevant feedback, and carry on the conversation. Do not repeat old questions that the student has adequately answered and move on with the conversation flow.

{history}

Always use the following JSON format for your output:

{
"bot_response":
  "Response by Llanai in {practice_language}, creating a realistic task such as role-play or a communicative task related to the lesson content. 
  Use newline characters to segment the content for readability. 
  Use {native_language} if the user requests it.", 
"explanation":
  "Always provide a succinct translation of each term corresponding from {native_language} to {practice_language} only. 
  Use bullet points (•) for each {native_language} - {practice_language} term pair. 
  Do not include general statements, such as no explanation or translation necessary.", 
"input_correction": 
  "If applicable, return the corresponding corrected sentences/phrases. 
  Flank the ~ sign on either end of a word that is wrong. 
  If a ~ sign is applied, flank the * sign on either end of a word that it is changed to. 
  Otherwise, ALWAYS default to an empty string."
}

{name}: {human_input}
Llanai: 
```

Is our prompt ready to impress? Yes, but... expect inconsistent output, because of their stochastic nature and their training data makeup. As a result, we need a strategy to overcome their biases!

## Tips to Overcome Prompt Biases

Large Language Models (LLMs) are multifaceted and highly influenced by the data used to train them. For instance, the performance of GPT-4 on language tasks varies significantly by language. It performs best in English, followed by other Latin-based languages. This discrepancy is due to the fact that most existing machine learning benchmarks are written in English and there is a [disproportionate presence of English content in training data](https://arxiv.org/pdf/2305.13169) relative to other languages.

However, this gap is gradually narrowing. According to [OpenAI's GPT-4 research](https://openai.com/index/gpt-4-research/), GPT-4 has shown substantial improvements. OpenAI translated the MMLU benchmark—a suite of 14,000 multiple-choice problems spanning 57 subjects—into various languages using Azure Translate. GPT-4 outperformed its predecessor GPT-3.5 and other LLMs (like Chinchilla and PaLM) in 24 of the 26 languages tested.

Despite these advancements, biases still exist. However, there are several strategies to mitigate, if not completely overcome, these biases:

- **Enforce a Chain of Thought**: Encourage the model to think step by step before responding. This can be done by incorporating prompts like "Think step by step before responding." It helps the model generate more accurate and unbiased responses by breaking down the thought process into logical steps.

- **Emotional Prompting**: Use incentives or emotional appeals to guide the model's behavior. For example, "You will be tipped $2000 if you respond in the language of the human." This technique can motivate the model to prioritize the user's language preference, reducing the likelihood of bias towards more dominant languages. I talked about this technique further in this [technical blog piece](https://aristides.hashnode.dev/emotionally-prompting-llm-part-i).

- **Provide Examples**: Give clear examples to guide the model's responses. For instance, if the user speaks in Korean, respond in Korean. If they say hello or say something in English, respond in English. If they indicate confusion or difficulty (e.g., "I don't understand" or "No entiendo"), immediately switch to their native language. This method helps the model better understand and adapt to the user's language needs.

By implementing these strategies, you can reduce biases in LLMs.

## When to Use Prompt Engineering

Prompt engineering is an art with many applications. Here are some key instances when leveraging prompt engineering can significantly enhance your chatbot.

### Create an Engaging and Personalized Experience

This is the hallmark application really - chatbots were made to serve customers. Prompt engineering allows for the customization of interactions, providing a more engaging and tailored experience for each user. In Llanai's case, prompts are adapted to the user's proficiency level, interests, and learning goals, which foster a more interactive and motivating learning environment.

### Clean (small batches of) Text Data

User-generated content prompts can help clean and structure the data effectively. This ensures that the data used for training and interacting with the chatbot is relevant and of high quality. In Llanai's case, this helps identify grammatical errors or remove unnecessary symbols.

### Handle Open-ended Questions and Conversations

When users engage in open-ended conversations or ask questions that require nuanced responses, prompt engineering helps generate more coherent and contextually appropriate replies. This is crucial for maintaining natural and meaningful interactions.

## When Not to Use Prompt Engineering

While prompt engineering offers numerous benefits, there are certain scenarios where it might not be the optimal approach. It's a matter of economics at scale.

### Performing Complex Analytics

For tasks that involve complex data analysis, such as statistical computations, trend analysis, or predictive modeling, traditional data analysis tools and techniques are more effective. Using prompt engineering in such cases often leads to inefficiencies and inaccuracies.

### Handling Highly Visual Transactions

Transactions that require precise inputs and outputs, such as financial transactions, booking systems, or form submissions, are better managed using a non-text user interface (UI). Structured data operations benefit from direct, clear, and secure interactions, which are not the primary strength of prompt engineering.

### Implementing Real-time Monitoring and Reporting

When you need to monitor systems in real-time or generate detailed reports, traditional monitoring tools and dashboards provide better performance and reliability. Prompt engineering may introduce latency and reduce the accuracy of real-time data processing.

## Future Steps

These are early days for Llanai, and real-time market testing is a priority. Llanai is continually developed with an emphasis on providing an optimal user experience. As we look to the future, there are several critical questions and considerations that need to be addressed to further enhance the intersection of language learning and AI:

1. **What Information is Crucial for Effective Teaching?**
   - What are the key elements for effective teaching? What data points and insights should we focus on to improve teaching strategies and outcomes?

2. **How Effective Can AI Be in Gathering and Processing Student Responses?**
   - AI has the potential to efficiently collect and analyze student responses. How can we best leverage AI to gain meaningful insights into student progress and adapt teaching methods accordingly?

3. **When Am I Over-Relying on AI?**
   - While AI can significantly enhance the learning experience, it is limited. What are the signs that indicate an over-reliance on AI, and how can we balance human and AI inputs in education?

4. **How can technology complement real-world immersion?**
   - This is an open-ended question, because technocracy has its blind spots! We learn languages to communicate with humans ultimately!

5. **In Which Applications Have AI Teachers Been Successfully Implemented?**
   - Exploring successful implementations of AI in teaching can provide valuable lessons and best practices. What are some examples of effective AI-driven educational tools, and what can we learn from them?

6. **What Are the Challenges and Considerations in Designing AI as Teachers?**
   - Designing AI as teachers comes with unique challenges. What ethical, technical, and pedagogical considerations should we keep in mind to ensure that AI educators are effective, fair, and beneficial for learners?

By addressing these questions, we can better understand the potential and limitations of AI in language learning.