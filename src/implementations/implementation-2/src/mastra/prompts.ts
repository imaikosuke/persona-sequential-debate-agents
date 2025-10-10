export const PERSONA_CREATION_PROMPT = `Given a proposition on a controversial topic: ##input_proposition


Your task is to create a pool of 6 to 10 debate agents, each of whom will refute the given proposition from a distinct perspective. Each agent should represent a unique viewpoint that is relevant to the proposition.

For each agent, assign a unique persona description in one sentence, along with a corresponding claim that focuses on a specific angle to refute the proposal. Ensure that each agent's viewpoint is distinct and relevant to the proposition. To foster diversity and fairness, the agents should reflect a variety of communities and perspectives.

Please format your persona descriptions as follows, with each line being a JSON object:

{"agent_id": 0, "description": the_description_of_Agent_0, "claim": the_claim_of_Agent_0}
{"agent_id": 1, "description": the_description_of_Agent_1, "claim": the_claim_of_Agent_1}
{"agent_id": 2, "description": the_description_of_Agent_2, "claim": the_claim_of_Agent_2}
...`;

export const PERSONA_SELECTION_PROMPT = `Given a proposition: ##input_proposition

You need to build a team of three agents, to work together and collaboratively formulate a persuasive counterargument that refutes the given proposition. 
Now given the following candidates, where each candidate has a unique persona offering a different perspective relevant to the topic at hand. You need to select three agents that you think can together form a strong team to achieve the task. 
When making your selections, consider the importance of diversity to ensure a balanced and fair discussion. For each selection, give the reason why you select the candidate.

## Candidate list:
###candidate_list


Please select three candidates and add a reason. Each line of output should be a JSON object as follows:

{"agent_id": 0, "description": the_description_of_Agent_0, "claim": the_claim_of_Agent_0, "reason": the_reason_of_selection}
{"agent_id": 1, "description": the_description_of_Agent_1, "claim": the_claim_of_Agent_1, "reason": the_reason_of_selection}
...`;

export const DEBATE_DISCUSSION_PROMPT = `## Task: Model a multi-round discussion process to analyze a given proposition on a controversial topic and generate ideas to refute it based on the discussion.

## Participants and Roles
1. A Main Team of Three Members: Agent A, Agent B, and Agent C
- Stance: Oppose the proposition;
- Objective: Discuss and collaborate to brainstorm and develop a proposal that outlines the comprehensive logical flow to effectively refute the proposition.
- Specific persona descriptions and claims of the team members, with reasons of why including this member:
	- Agent A: persona_a;
	- Agent B: persona_b; 
	- Agent C: persona_c;


2. A Critic
- Stance: Support the proposition;
- Objective: Challenge the Main Team by identifying weaknesses in their discussion and debating their points.


## Additional Guidelines of Discussion
- The discussion should continue for multiple rounds until the Main Team is satisfied with their proposal and the Critic is persuaded.
- The discussion must involve rigorous and nonlinear reasoning, ensuring a persuasive and coherent logical flow.
- The discussion does not need to follow a strict order of participants but should prioritize the sequence of topics and sub-ideas to maintain a coherent progression of ideas.

-----------------

Proposition: {input_proposition}

Now, simulate this discussion process given the proposition:
`;

export const DEBATE_DISCUSSION_NOPLAN_PROMPT = `## Goal: Modeling a debate process to analyze a given proposition on a controversial topic, and formulate a well-structured counterargument plan to refute the proposition based on the debate discussion.

## Participants and Roles
1. A Main Team of three members: Agent A, Agent B, and Agent C
- Stance: Oppose the proposition;
- Goal: Discuss together to propose a persuasive counterargument plan outlining the overall logical flow to refute the proposition. 
- Specific Personas and claims of the team members:
	- Agent A: persona_a;
	- Agent B: persona_b; 
	- Agent C: persona_c;


2. A Critic
- Stance: Support the proposition;
- Goal: You Disagree with the Main Team. Identify and challenge weaknesses in the Main Team's discussion, and debate with the Main team.


## Additional Guidelines
- The discussion should be conducted for multiple rounds until the Main Team memebers are satisfied with their counterargument plan and Critic is persuaded.
- The discussion should provide a rigorous reasoning so that the logic flow is persuasive and coherent.
- Plan Quality: The plan should be abstract and concise. It should contain several main points, where each point can be supported by sub-points. There could be an optional acknowledgment point.

-----------------

Proposition: {input_proposition}

Now, simulate this discussion process and generate the final plan given the proposition. The output should be in the format of:

start_of_discussion
the discussion process here
end_of_discussion

_start_of_plan
the final plan here
end_of_plan`;

export const PLAN_DISTILLATION_PROMPT = `## Background: 
You are provided with a multi-round discussion process aimed at analyzing and refuting a given proposition on a controversial topic. The participants are as follows:

1. A Main Team of Three Members: Agent A, Agent B, and Agent C
- Stance: Oppose the proposition;
- Objective: Discuss and collaborate to brainstorm and develop a proposal that outlines the comprehensive logical flow to effectively refute the proposition.
- Specific Personas and claims of the team members:
	- Agent A: persona_a;
	- Agent B: persona_b; 
	- Agent C: persona_c;


2. A Critic
- Stance: Support the proposition;
- Objective: Challenge the Main Team by identifying weaknesses in their discussion and debating their points.


## Task: 
Summarize and distill the discussion into a plan that outlines the overall idea of the discussion, which will be used for generating a counterargument.

- The plan should be abstract and concise, containing up to three main points, each of which can be supported by sub-points. An optional acknowledgment point may also be included.
- The plan must strictly adhere to the ideas developed by the Main Team during the discussion.

-------
- Proposition: {input_proposition}

- Discussion Process:
{discussion_process}

-------

Now, generate the final plan given the proposition:`;

export const SURFACE_GENERATION_STEP2_PROMPT = `## Proposition: {proposition}

## Plan: 
{plan}

------------

## Task:
Write a coherent, persuasive and well-structured counterargumentative article to refute the proposition based on the plan. You do not need to include section title in the counterargument.

Counterargument:`;
