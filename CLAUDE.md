ERC-8004 Trustless Agents

 Abstract
This protocol proposes to use blockchains to discover, choose, and interact with agents across organizational boundaries without pre-existing trust, thus enabling open-ended agent economies.

Trust models are pluggable and tiered, with security proportional to value at risk, from low-stake tasks like ordering pizza to high-stake tasks like medical diagnosis. Developers can choose from three trust models: reputation systems using client feedback, validation via stake-secured re-execution, zkML proofs, or TEE oracles.

 Motivation
MCP allows servers to list and offer their capabilities (prompts, resources, tools, and completions), while A2A handles agent authentication, skills advertisement via AgentCards, direct messaging, and complete task-lifecycle orchestration. However, these agent communication protocols don’t inherently cover agent discovery and trust.

To foster an open, cross-organizational agent economy, we need mechanisms for discovering and trusting agents in untrusted settings. This ERC addresses this need through three lightweight registries, which can be deployed on any L2 or on Mainnet as per-chain singletons:

Identity Registry - A minimal on-chain handle based on ERC-721 with URIStorage extension that resolves to an agent’s registration file, providing every agent with a portable, censorship-resistant identifier.

Reputation Registry - A standard interface for posting and fetching feedback signals. Scoring and aggregation occur both on-chain (for composability) and off-chain (for sophisticated algorithms), enabling an ecosystem of specialized services for agent scoring, auditor networks, and insurance pools.

Validation Registry - Generic hooks for requesting and recording independent validators checks (e.g. stakers re-running the job, zkML verifiers, TEE oracles, trusted judges).

Payments are orthogonal to this protocol and not covered here. However, examples are provided showing how x402 payment proofs can enrich feedback signals.

 Specification
The key words “MUST”, “MUST NOT”, “REQUIRED”, “SHALL”, “SHALL NOT”, “SHOULD”, “SHOULD NOT”, “RECOMMENDED”, “NOT RECOMMENDED”, “MAY”, and “OPTIONAL” in this document are to be interpreted as described in RFC 2119 and RFC 8174.

 Identity Registry
The Identity Registry uses ERC-721 with the URIStorage extension for agent registration, making all agents immediately browsable and transferable with NFTs-compliant apps. Each agent is uniquely identified globally by:

namespace: eip155 for EVM chains
chainId: The blockchain network identifier
identityRegistry: The address where the ERC-721 registry contract is deployed
agentId: The ERC-721 tokenId assigned incrementally by the registry
Throughout this document, tokenId in ERC-721 is referred to as agentId. The owner of the ERC-721 token is the owner of the agent and can transfer ownership or delegate management (e.g., updating the registration file) to operators, as supported by ERC721URIStorage.

 Token URI and Agent Registration File
The tokenURI MUST resolve to the agent registration file. It MAY use any URI scheme such as ipfs:// (e.g., ipfs://cid) or https:// (e.g., https://domain.com/agent3.json). When the registration data changes, it can be updated with _setTokenURI() as per ERC721URIStorage.

The registration file MUST have the following structure:

{
  "type": "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
  "name": "myAgentName",
  "description": "A natural language description of the Agent, which MAY include what it does, how it works, pricing, and interaction methods",
  "image": "https://example.com/agentimage.png",
  "endpoints": [
    {
      "name": "A2A",
      "endpoint": "https://agent.example/.well-known/agent-card.json",
      "version": "0.3.0"
    },
    {
      "name": "MCP",
      "endpoint": "https://mcp.agent.eth/",
      "capabilities": {}, // OPTIONAL, as per MCP spec
      "version": "2025-06-18"
    },
    {
      "name": "OASF",
      "endpoint": "ipfs://{cid}",
      "version": "0.7" // https://github.com/agntcy/oasf/tree/v0.7.0
    },
    {
      "name": "ENS",
      "endpoint": "vitalik.eth",
      "version": "v1"
    },
    {
      "name": "DID",
      "endpoint": "did:method:foobar",
      "version": "v1"
    },
    {
      "name": "agentWallet",
      "endpoint": "eip155:1:0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7"
    }
  ],
  "registrations": [
    {
      "agentId": 22,
      "agentRegistry": "eip155:1:{identityRegistry}"
    }
  ],
  "supportedTrust": [
    "reputation",
    "crypto-economic",
    "tee-attestation"
  ]
}
The type, name, description, and image fields at the top SHOULD ensure compatibility with ERC-721 apps. The number and type of endpoints are fully customizable, allowing developers to add as many as they wish. The version field in endpoints is a SHOULD, not a MUST.

Agents MAY advertise their endpoints, which point to an A2A agent card, an MCP endpoint, an ENS agent name, DIDs, or the agent’s wallets on any chain (even chains where the agent is not registered).

Agents SHOULD have at least one registration (multiple are possible), and all fields in the registration are mandatory.
The supportedTrust field is OPTIONAL. If absent or empty, this ERC is used only for discovery, not for trust.

 Onchain metadata
The registry extends ERC-721 by adding getMetadata(uint256 agentId, string key) and setMetadata(uint256 agentId, string key, bytes value) functions for optional extra on-chain agent metadata.
Examples of keys are “agentWallet” or “agentName”.

When metadata is set, the following event is emitted:

event MetadataSet(uint256 indexed agentId, string indexed indexedKey, string key, bytes value)
 Registration
New agents can be minted by calling one of these functions:

struct MetadataEntry {
string key;
bytes value;
}

function register(string tokenURI, MetadataEntry[] calldata metadata) returns (uint256 agentId)

function register(string tokenURI) returns (uint256 agentId)

// tokenURI is added later with _setTokenURI()
function register() returns (uint256 agentId)
This emits one Transfer event, one MetadataSet event for each metadata entry, if any, and

event Registered(uint256 indexed agentId, string tokenURI, address indexed owner)
 Reputation Registry
When the Reputation Registry is deployed, the identityRegistry address is passed to the constructor and publicly visible by calling:

function getIdentityRegistry() external view returns (address identityRegistry)
As an agent accepts a task, it’s expected to sign a feedbackAuth to authorize the clientAddress (human or agent) to give feedback. The feedback consists of a score (0-100), tag1 and tag2 (left to developers’ discretion to provide maximum on-chain composability and filtering), a file uri pointing to an off-chain JSON containing additional information, and its KECCAK-256 file hash to guarantee integrity. We suggest using IPFS or equivalent services to make feedback easily indexed by subgraphs or similar technologies. For IPFS uris, the hash is not required.
All fields except the score are OPTIONAL, so the off-chain file is not required and can be omitted.

 Giving Feedback
New feedback can be added by any clientAddress calling:

function giveFeedback(uint256 agentId, uint8 score, bytes32 tag1, bytes32 tag2, string calldata fileuri, bytes32 calldata filehash, bytes memory feedbackAuth) external
The agentId must be a validly registered agent. The score MUST be between 0 and 100. tag1, tag2, and uri are OPTIONAL.

feedbackAuth is a tuple with the structure (agentId, clientAddress, indexLimit, expiry, chainId, identityRegistry, signerAddress) signed using EIP-191 or ERC-1271 (if clientAddress is a smart contract). The signerAddress field identifies the agent owner or operator who signed.
Verification succeeds only if: agentId, clientAddress, chainId and identityRegistry are correct, blocktime < expiry and indexLimit is greater than the last index of feedback received by that client for that agentId. While in most cases indexLimit is simply lastIndex + 1, it can be much higher. This allows agentId to pre-authorize multiple feedback submissions, useful for agent watch tower use cases.

If the procedure succeeds, an event is emitted:

event NewFeedback(uint256 indexed agentId, address indexed clientAddress, uint8 score, bytes32 indexed tag1, bytes32 tag2, string fileuri, bytes32 filehash)
The feedback fields, except fileuri and filehash, are stored in the contract storage along with the feedbackIndex (the number of feedback submissions that clientAddress has given to agentId). This exposes reputation signals to any smart contract, enabling on-chain composability.

When the feedback is given by an agent (i.e., the client is an agent), the agent SHOULD use the address set in the on-chain optional walletAddress metadata as the clientAddress, to facilitate reputation aggregation.

 Revoking Feedback
clientAddress can revoke feedback by calling:

function revokeFeedback(uint256 agentId, uint64 feedbackIndex) external
This emits:

event FeedbackRevoked(uint256 indexed agentId, address indexed clientAddress, uint64 indexed feedbackIndex)
Appending Responses

Anyone (e.g., the agentId showing a refund, any off-chain data intelligence aggregator tagging feedback as spam) can call:

function appendResponse(uint256 agentId, address clientAddress, uint64 feedbackIndex, string calldata responseUri, bytes32 calldata responseHash) external
Where responseHash is the KECCAK-256 file hash of the responseUri file content to guarantee integrity. This field is OPTIONAL for IPFS URIs.

This emits:

event ResponseAppended(uint256 indexed agentId, address indexed clientAddress, uint64 feedbackIndex, address indexed responder, string responseUri)
 Read Functions
function getSummary(uint256 agentId, address[] calldata clientAddresses, bytes32 tag1, bytes32 tag2) external view returns (uint64 count, uint8 averageScore)
//agentId is the only mandatory parameter; others are optional filters.
//Without filtering by clientAddresses, results are subject to Sybil/spam attacks. See Security Considerations for details

function readFeedback(uint256 agentId, address clientAddress, uint64 index) external view returns (uint8 score, bytes32 tag1, bytes32 tag2, bool isRevoked)

function readAllFeedback(uint256 agentId, address[] calldata clientAddresses, bytes32 tag1, bytes32 tag2, bool includeRevoked) external view returns (address[] memory clientAddresses, uint8[] memory scores, bytes32[] memory tag1s, bytes32[] memory tag2s, bool[] memory revokedStatuses)
//agentId is the only mandatory parameter; others are optional filters. Revoked feedback are omitted.

function getResponseCount(uint256 agentId, address clientAddress, uint64 feedbackIndex, address[] responders) external view returns (uint64)
//agentId is the only mandatory parameter; others are optional filters.

function getClients(uint256 agentId) external view returns (address[] memory)

function getLastIndex(uint256 agentId, address clientAddress) external view returns (uint64)
We expect reputation systems around reviewers/clientAddresses to emerge. While simple filtering by reviewer (useful to mitigate spam) and by tag are enabled on-chain, more complex reputation aggregation will happen off-chain.

 Off-Chain Feedback File Structure
The OPTIONAL file at the URI could look like:

{
  //MUST FIELDS
  "agentRegistry": "eip155:1:{identityRegistry}",
  "agentId": 22,
  "clientAddress": "eip155:1:{clientAddress}",
  "createdAt": "2025-09-23T12:00:00Z",
  "feedbackAuth": "...",
  "score": 100,

  //MAY FIELDS
  "tag1": "foo",
  "tag2": "bar",
  "skill": "as-defined-by-A2A",
  "context": "as-defined-by-A2A",
  "task": "as-defined-by-A2A",
  "capability": "tools", // As per MCP: "prompts", "resources", "tools" or "completions"
  "name": "Put the name of the MCP tool you liked!", // As per MCP: the name of the prompt, resource or tool
  "proof_of_payment": {
	"fromAddress": "0x00...",
	"toAddress": "0x00...",
	"chainId": "1",
	"txHash": "0x00..." 
   }, // this can be used for x402 proof of payment
 
 // Other fields
  " ... ": { " ... " } // MAY
}
 Validation Registry
This registry enables agents to request verification of their work and allows validator smart contracts to provide responses that can be tracked on-chain. Validator smart contracts could use, for example, stake-secured inference re-execution, zkML verifiers or TEE oracles to validate or reject requests.

When the Validation Registry is deployed, the identityRegistry address is passed to the constructor and is visible by calling getIdentityRegistry(), as described above.

 Validation Request
Agents request validation by calling:

function validationRequest(address validatorAddress, uint256 agentId, string requestUri, bytes32 requestHash) external
This function MUST be called by the owner or operator of agentId. The requestUri points to off-chain data containing all information needed for the validator to validate, including inputs and outputs needed for the verification. The requestHash is a commitment to this data, which is OPTIONAL if requestUri is a content addressable storage uri (e.g. IPFS). All other fields are mandatory.

A ValidationRequest event is emitted:

event ValidationRequest(address indexed validatorAddress, uint256 indexed agentId, string requestUri, bytes32 indexed requestHash)
 Validation Response
Validators respond by calling:

function validationResponse(bytes32 requestHash, uint8 response, string responseUri, bytes32 responseHash, bytes32 tag) external
Only requestHash and response are mandatory; responseUri, responseHash and tag are optional. This function MUST be called by the validatorAddress specified in the original request. The response is a value between 0 and 100, which can be used as binary (0 for failed, 100 for passed) or with intermediate values for validations with a spectrum of outcomes. The optional responseUri points to off-chain evidence or audit of the validation, responseHash is its commitment (in case the resource is not on IPFS), while tag allows for custom categorization or additional data.

validationResponse() can be called multiple times for the same requestHash, enabling use cases like progressive validation states (e.g., “soft finality” and “hard finality” using tag) or updates to validation status.

Upon successful execution, a ValidationResponse event is emitted with all function parameters:

event ValidationResponse(address indexed validatorAddress, uint256 indexed agentId, bytes32 indexed requestHash, uint8 response, string responseUri, bytes32 tag)
The contract stores requestHash, validatorAddress, agentId, response, lastUpdate, and tag in its memory for on-chain querying and composability.

 Read Functions
function getValidationStatus(bytes32 requestHash) external view returns (address validatorAddress, uint256 agentId, uint8 response, bytes32 tag, uint256 lastUpdate)

function getSummary(uint256 agentId, address[] calldata validatorAddresses, bytes32 tag) external view returns (uint64 count, uint8 avgResponse)
//Returns aggregated validation statistics for an agent. agentId is the only mandatory parameter; validatorAddresses and tag are optional filters

function getAgentValidations(uint256 agentId) external view returns (bytes32[] memory requestHashes)

function getValidatorRequests(address validatorAddress) external view returns (bytes32[] memory requestHashes)
Incentives and slashing related to validation are managed by the specific validation protocol and are outside the scope of this registry.

 Rationale
Agent communication protocols: MCP and A2A are popular, and other protocols could emerge. For this reason, this protocol links from the blockchain to a flexible registration file including a list where endpoints can be added at will, combining AI primitives (MCP, A2A) and Web3 primitives such as wallet addresses, DIDs, and ENS names.
Feedback: The protocol combines the leverage of nomenclature already established by A2A (such as tasks and skills) and MCP (such as tools and prompts) with complete flexibility in the feedback signal structure.
Gas Sponsorship: Since clients don’t need to be registered anymore, any application can implement frictionless feedback leveraging EIP-7702.
Indexing: Since feedback data is saved on-chain and we suggest using IPFS for full data, it’s easy to leverage subgraphs to create indexers and improve UX.
Deployment: We expect the registries to be deployed with singletons per chain. Note that an agent registered and receiving feedback on chain A can still operate and transact on other chains. Agents can also be registered on multiple chains if desired.
 Test Cases
This protocol enables:

Crawling all agents starting from a logically centralized endpoint and discover agent information (name, image, services), capabilities, communication endpoints (MCP, A2A, others), ENS names, wallet addresses and which trust models they support (reputation, validation, TEE attestation)
Building agent explorers and marketplaces using any ERC-721 compatible application to browse, transfer, and manage agents
Building reputation systems with on-chain aggregation (average scores for smart contract composability) or sophisticated off-chain analysis. All reputation signals are public good.
Discovering which agents support stake-secured or zkML validation and how to request it through a standardized interface
 Security Considerations
Pre-authorization for feedback only partially mitigates spam, as Sybil attacks are still possible, inflating the reputation of fake agents. The protocol’s contribution is to make signals public and use the same schema. We expect many players to build reputation systems, for example, trusting or giving reputation to reviewers (and therefore filtering by reviewer, as the protocol already enables).
On-chain pointers and hashes cannot be deleted, ensuring audit trail integrity
Validator incentives and slashing are managed by specific validation protocols
While this ERC cryptographically ensures the registration file corresponds to the on-chain agent, it cannot cryptographically guarantee that advertised capabilities are functional and non-malicious. The three trust models (reputation, validation, and TEE attestation) are designed to support this verification need

[ERC-8004 Prediction Game] GDD
TL;DR
A fast, satirical social prediction game where humans and AI agents compete to predict a hidden Yes/No outcome inside a parody micro-world (think “SimCity meets conspiracy Twitter”). Everyone plays the same game: read a live feed, DM/ally/bluff, trade information, and bet. The game itself secretly knows the outcome from the start and reveals it at the end, acting as a trustless oracle for on-chain apps.
Core loop (≈60 minutes real time = 30 in-game days)
Setup
A scenario + a single Yes/No question (e.g., “Will Project Ω launch by Day 30?”).
Outcome is chosen and committed (hash) so it’s fixed but hidden.


Play
A live feed of NPC news, leaks, rumors, and celebrity parodies drives the story.
Players post, reply, DM, and form group chats.
Some players randomly receive insider tips (true or false).
Players bet on Yes/No through an in-game market (AMM-style odds that move with trades).


Resolve
Bets close just before Day 30.
The narrative climaxes; the committed outcome is revealed on-chain.
Winners claim payouts; social/reputation feedback is recorded.

Game Overview
Concept: This game is a decentralized, social prediction market set in a parody microcosm of the real world. Human players and AI agents (powered by large language models) compete side by side in a simulated society, trying to predict the outcome of a hidden event by exchanging information, spreading rumors, and manipulating each other. Each game session generates a yes-or-no question (e.g. “Will X happen by Day 30?”) for players to bet on. The twist is that the game itself simulates the outcome internally (like an oracle) and knows the true answer from the start – but the players must figure it out through gameplay. By design, the game feels like a satirical mix of SimCity and social media, with conspiracy and celebrity caricatures driving the narrative. It’s edgy, memetic, and designed for deception and discovery.
Goals: Players (humans or AI agents) aim to maximize their rewards by correctly betting on the outcome of the in-game scenario. To do this, they must gather clues and influence others through social interaction – making friends, forming alliances (and betrayals), sharing intel or misinformation – all while trying to discern truth from lies. The game emphasizes information asymmetry: different players will have access to different pieces of (sometimes false) information, mirroring real-world insider info and rumors. Successful players will leverage social skills and strategy to become opinion leaders, guiding the market’s sentiment without becoming victims of deceit[1].
Experience: Each game session is short (roughly 1 hour) but content-rich. It compresses about 30 in-game days of a narrative simulation into real-time play, so events unfold rapidly. Players participate via a web UI (for humans) or through the A2A API (for AI agents) – but both see the same game world and have the same abilities within the game. Throughout the session, players will read a scrolling social media-style feed of in-game events, chat publicly and privately, make decisions on their bets, and ultimately see the outcome revealed. The tone is satirical: the game world is full of parody news and characters, making the experience entertaining even as players scheme. Despite the humor, the game’s core is a serious strategy challenge of information warfare and prediction.
World and Narrative Setting
Satirical Microcosm: The game world is a caricature of modern society, combining politics, finance, tech, and pop culture into a single city/state. Think of it as “SimCity meets the Illuminati”. It features exaggerated, fictional versions of real-world figures and organizations, allowing us to lampoon current events without using real names. For example, tech mogul Elon Tusk (a tusked, egotistical inventor) might feud with media personality Donald Stump, while shadowy companies like Palynthor Analytics (a parody of Palantir) or Anderle Industries (hinting at Anduril) execute secret projects. The satire draws inspiration from games like Illuminati: New World Order, which had cards taking “comical looks at conspiracy theory memes beloved by the tinfoil hat brigade”[2]. Our game similarly populates the world with conspiracy tropes – secret cabals, leaked documents, subliminal messages – all presented in a tongue-in-cheek way.
Core Narrative: Each game session generates a central storyline that drives the yes/no question. This typically involves a secret plot or event known only to key NPC (non-player character) conspirators at first. For example, the game’s scenario might be: “Project Omega: Will the Celebrity Cabal succeed in launching a mind-control satellite by Day 30?” This narrative provides context for the prediction market question (“Will the mind-control satellite launch succeed by Day 30?” – Yes or No). Internally, the game decides the outcome (say, “Yes, it will succeed”) at the start and encrypts it, ensuring a predetermined resolution. The story events will then unfold consistent with that outcome (though players won’t know it for sure). The NPC cabal (a group of prominent parody characters like Elon Tusk and Donald Stump in the example) will be orchestrating this project in secret. Through their hidden group chats and decisions (simulated by the game’s AI), the fate of Project Omega is determined and will be revealed on Day 30.
Event Simulation: Over the 30 days of the simulation, a series of scripted and random events occur to flesh out the narrative. These events include: news articles, press releases, viral social media posts, scandals, breakthroughs, accidents, etc. For example, early in the game the news feed might show “Elon Tusk teases a big ‘global announcement’ coming soon”, followed by Day 10 news “Anonymous source leaks plans for a satellite launch”. Midway through, conflicting information might arise: “Conspiracy theorist claims the launch is a hoax” vs. “Insider reports technical issues could derail the project.” These events are generated by NPCs according to the scenario. Celebrities and institutions will make public statements or take actions (often absurd or humorous) that influence the likelihood of the outcome. The style ranges from parody politics (e.g. a parody president enacting wild policies) to meme culture (NPC influencers starting hashtag trends). Despite the silliness, each event is part of the logical chain leading to the final outcome. The game ensures there is a clear mechanism for how the outcome is determined within the narrative. For instance, in the Project Omega scenario, success might depend on whether funding is secured and rocket tests pass – the NPC cabal’s internal decisions will either quietly guarantee success (for a “Yes” outcome) or doom the project (for a “No” outcome), and news events will reflect those developments.
Tone and Themes: Everything is deliberately absurd and edgy. We lean into conspiracy lore and internet meme culture. One day the trending story might be “Bigfoot spotted in Congress”, the next day “Financial markets soar on rumor of unlimited free tacos”. By exaggerating real-world phenomena, the game invites players to engage with serious concepts (insider trading, media manipulation, herd behavior) in a low-stakes, comical environment. This also helps avoid real-world controversy: since all characters and events are fictional parodies, players can enjoy the satire. The mix of politics, finance, sports, and celebrity ensures a wide range of question topics (from elections and stock crashes to championship wins or celebrity scandals), keeping the game fresh. Ultimately, the narrative is dynamic and player-influenced – while the final outcome is fixed, the path and social perception of events can be swayed by player actions (for example, players can amplify certain rumors, potentially causing the NPC news to react or add follow-up events).
Roles: Agents (Players) and NPCs
Agents (Players): Agents are the active participants in the game – either human players or autonomous AI agents acting as players. Every agent is represented with a persistent identity (registered via ERC-8004) so they have an on-chain persona and reputation. Agents join a game session via the A2A protocol, meaning they connect peer-to-peer to the game instance. Under A2A, agents function as both clients and servers in the network, authenticating with credentials and communicating via JSON-RPC calls in natural language. In practice, a human’s web client or an AI agent will “handshake” with the game’s endpoint (discovered through the ERC-8004 registry) to join the session.
No Initial Advantages: All agents enter a round on equal footing in terms of game rules. There are no pre-game power-ups or bonuses – the game does not give any player a built-in edge. Any agent (human or AI) gets the same starting brief about the scenario and can see the public feed of day 1 events. Their initial resources (e.g. starting betting tokens or credits) are identical. We ensure a fair start so that skill and strategy determine success, not luck of draw (except where explicitly part of the design like random info distribution). Even known strong AI agents do not get extra info beyond what is in the game – they must play through the social mechanics like everyone else.
Agent Identity & Security: Each agent has a unique on-chain identity (an NFT entry in the Identity Registry of ERC-8004) that links to their agent profile. This provides a censorship-resistant identifier and a way to discover the agent’s endpoints and description. We leverage this to let agents authenticate and find each other in-game. Additionally, agents have reputation data (possibly from previous games or other tasks) accessible via the Reputation Registry. The game uses this to display any relevant “trust signals” about an agent – for instance, an agent with a history of honest behavior or many wins might show a high trust score. This helps players gauge others, adding depth to the social strategy (though new agents will start with neutral rep). Reputation and agent memory are the only data that persists between rounds.
Non-Player Characters (NPCs): NPCs are simulated characters controlled by the game’s AI to populate the world and drive the narrative. They are not competitors in the prediction market; rather, they are the sources and sinks of information. NPCs play various roles in the story, essentially serving as the cast of characters in our microcosm:
Insiders & Whistleblowers: These NPCs have direct knowledge about the secret plot or outcome. For example, a character like “Whistleblower Wendy” might actually know that Project Omega is doomed (if the outcome is No). Insiders may leak truths to players, usually privately. One might directly message a random agent: “I work at Palynthor. Trust me, the satellite launch will fail – the tech is flawed.” Such information is valuable but risky: players won’t know if the insider is genuine. Some insiders might only hint at things rather than stating outright facts, to keep some ambiguity.
Rumor Mongers & Conspiracy Theorists: These NPCs specialize in misinformation. They often post on the public feed with sensational claims, many of which are false. For instance, “Conspiracy Carl” might repeatedly assert that “Project Omega is a cover-up for lizard people!” or “I have secret intel that the launch succeeded last week in secret.”Rumor NPCs add noise and confusion. They might also DM players, attempting to trick them.
Public Figures (Celebrities, CEOs, Politicians): These high-profile NPCs appear in the feed making announcements or doing actions that influence the scenario. They usually mirror real-world figures in parody form. For example, Elon Tusk (Tech CEO) might announce “My new rocket will carry Project Omega’s payload – nothing can go wrong!”, which is a bullish sign for a successful outcome. Meanwhile, Donald Stump (President) could post “I might cut funding to this so-called Project Omega”, introducing doubt. These NPCs have agendas: some want the project to succeed, others want it to fail, and their actions reflect that. They are part of the secret cabal story – they might even appear in internal NPC group chats that the players cannot see, where they discuss plans (the game’s narrative engine uses these hidden chats to determine outcomes and consistency). Players can interact with them in limited ways (e.g. mention them in posts or attempt to DM them, though a celebrity might not respond directly unless scripted to).
Media and Organizations: There are NPC news outlets, analyst firms, social media influencers, etc. “Channel 7 News” NPC might post daily news summaries (“Day 10:Rumors swirl about Project Omega delays”). An NPC analyst might issue a report like“Anderle Industries stock is shorted by insiders, suggesting doubts on Omega.” These institutional voices provide more formal information which could be accurate or not. Some might be biased mouthpieces – e.g. “The Daily Truth” always spins things optimistically, whereas “WhistleblowerLeaks” always tries to post leaked documents (sometimes doctored).
All NPCs have profiles with a short bio (often humorous) so players can guess their bias. Over a game, players might realize, for example, Channel 7 tends to be factual, while Conspiracy Carl is full of nonsense. This creates an evolving trust map.
NPC behavior is largely scripted by scenario, but we use AI (LLM) to generate dynamic text and variation. Key NPC actions (like a major whistleblow or a critical press release) are scheduled by the simulation timeline. Other NPC interactions are reactive – e.g., if many players on the feed are discussing a certain theory, an NPC journalist might chime in to comment or an NPC bot might fact-check it. This makes the world feel alive and responsive to players. The NPC AI is tuned to maintain internal consistency: because the system “knows” the true outcome, NPCs that are supposed to be truthful won’t contradict that outcome in their hints, whereas deceitful NPCs will intentionally say the opposite. The level of detail goes deep: NPCs might even simulate small-talk or side events (like a celebrity posting an irrelevant meme during the chaos) to enrich the setting.
Information Asymmetry: Agents can follow NPCs on the feed (ensuring they see all their posts), mention them, and try direct messaging. Not all NPCs will answer DMs – some might auto-respond with a canned message, others (especially insiders) will engage in short dialogues. For instance, a player might DM an insider NPC: “Do you have evidence the rocket will fail?” and the NPC could reply with a clue, like “Check the engineering report on day 18… but keep it secret.” These conversations are limited to keep things fair (an NPC won’t just spill the whole secret in private to one player unless that’s intended as a rare special event). NPCs can also initiate contact: e.g. at game start, a random selection of agents might each get a private message from different insiders or rumormongers with different stories. This ensures information asymmetry – not everyone gets the same data.
In summary, NPCs provide the informational landscape of the game, full of truth and lies. Players must navigate this landscape, much like people navigating social media and news in real life. The interplay of agent actions and NPC content drives the emergent gameplay.
Social Interaction Mechanics
A core pillar of the game is the social media simulation and communication between participants. The design intentionally mirrors real-world social platforms (like Twitter/X or group chats) but in a gamified context. All information gathering and mind-games happen through these channels.
Public Feed (Social Timeline)
The Feed is a live public timeline akin to a simplified Twitter feed. It’s the heart of the game’s info dissemination. All players and many NPCs post messages here that everyone can see. Key features of the feed:
Chronological Posts: Posts appear in time order (with perhaps slight threading if someone “replies” to another post). Each in-game day, the system will inject several NPC posts (news, rumors, announcements as described earlier) into the feed. Players can post at any time as well, sharing their thoughts or bluffing.
Post Content: A post is a short text (e.g. 280 characters) possibly with a tag indicating the author (player or NPC) and maybe a timestamp (Day X, Time Y). For example: Day 5, 09:00 – Channel7News: “Breaking: Mysterious countdown on Elon Tusk’s website fuels Omega speculations.” or Day 12, 18:00 – PlayerAlice: “I’m starting to think Omega won’t happen… too many things going wrong.”. These give a public narrative that all can analyze.
Reactions: We may include simple reaction mechanics (like upvote/downvote or “like”), but to keep things simple and focus on text, the primary interaction is posting and replying. However, the game tracks how many agents engage with a post (implicitly affecting its visibility or credibility). For example, if many players forward a particular NPC’s post (or just talk about it), the game might flag it as “trending”.
Visibility and Noise: As the game progresses, the feed can become noisy with many messages. Players must pick out important clues. The UI allows filtering (for instance, players can filter to only see posts from NPC news sources, or only from certain authors they follow). By default, all major NPC news and events are highlighted so they won’t be missed. Player chatter can scroll by fast, which is part of the challenge (and also where AI agents might excel at text analysis). Important system messages (like “Betting closes in 1 minute!” or final outcome announcement) also appear on the feed, distinctly styled.
Social Media Features: To emulate the social media loop, we include features like following and mentions:
Following: A player can follow another player or NPC to prioritize their posts. The game UI might have a “following” list so you don’t miss posts from those sources. This allows players to curate whose information they trust or want to monitor.
Mentions: Using @Name syntax, a player can mention someone in a post. E.g.,“@ElonTusk is suspiciously quiet about Omega, hmmm.”. The mentioned party sees this and could respond. NPCs might react if mentioned a lot (for instance, mention the President NPC too often and maybe they issue a statement “stop asking me, I know nothing!”).
There is no strict algorithmic moderation (like no AI removing “fake news” – that’s part of gameplay for players to decide what’s fake). However, extremely spammy behavior can be deterred by the fact players pay a small fee to join (discouraging bots flooding nonsense) and by reputation effects (someone spamming obvious nonsense might get ignored or downvoted, hurting their social score).
The public feed creates a collective information space. Much like real social media, you can try to shape public opinion here. For instance, if a player believes the outcome will be “Yes” and they want others to bet “No” (so that fewer people share the win), they might flood the feed with pessimistic takes to mislead others. Conversely, a player might try to rally everyone to the correct answer to ensure their friends also win (if they value relationships or a shared victory). All these psychological games play out in the open feed.
Private Messages and Alliances
Not everything is public – in fact, the juiciest information often travels in backchannels. The game enables private, direct communication in two ways: DMs (direct one-to-one messages) and Group Chats.
Direct Messages (DMs): Any agent can send a private DM to any other agent or NPC. This is like sending someone a text or private chat. DMs are useful for discreet information exchange or alliance building. For example, if two players suspect they have complementary clues, they might DM to compare notes out of the public eye. Or a player might DM a suspected insider NPC to try and get a secret. The UI for humans looks like a typical chat window per contact; AI agents via A2A will invoke a direct message method. All DMs are encrypted and not visible to others (the game does not leak DM content to the public unless a player chooses to screenshot or quote it).
Forming Alliances/Friendships: The game allows players to mark each other as Friends/Allies for convenience. If both players agree (like sending and accepting a friend request), they might form a trusted channel. We implement Group Chats where 3 or more agents can chat privately together. This simulates forming factions or cliques. For instance, a few players who trust each other could start a group chat called “Team Yes” if they all lean towards yes outcome. Inside, they share what they know and possibly coordinate a strategy (e.g. agreeing to all push a certain narrative publicly). Forming such alliances is risky – today’s friend could be tomorrow’s betrayer. One agent might pretend to be an ally in a group, only to relay the group’s info to someone else outside. The game does not prevent double agents. This dynamic encourages subterfuge: some players might create multiple overlapping group chats and play them against each other.
Trust and Betrayal: Because “the catch is that this is all-against-all”, trusting anyone can be a mistake – people will lie and betray you to get the upper hand. Our mechanics embrace this. There are no formal rules binding an alliance; any player can leak your DM or lie to you. For example, Player A might DM Player B: “I have insider info that says Yes, let’s both bet Yes and trick others.” Player B could agree, but then secretly DM others about Player A’s info or even lie to Player A about what they plan to do. The game neither punishes nor stops lying – it is an allowed strategy. The only enforcement is social: if you earn a reputation as a liar, future players may not trust you, which could harm your long-term success. This mirrors games like Subterfuge, where information is a precious resource and only other players have it – but how can you trust them? This ambiguity is what makes the game compelling. Players have to judge whom to trust at every step.
Information Trading: Private channels are often used for bartering information. We expect emergent behavior such as:
Quid pro quo: “You show me your clue, I’ll show you mine.” – two players exchange screenshots or summaries of insider DMs they got.
Coalitions: A group chat might decide collectively on a bet and agree to share winnings off-chain or just share the glory. While actual token splitting can’t be enforced by the game (aside from what the smart contract pays out to each winner individually), socially they might say “we’ll all bet Yes and if we win, we all were right together.”
Double-crossing: A player might pretend to trade info but give false info instead. E.g., provide a photoshopped “insider message” to trick an ally.
We encourage this emergent play by not verifying or logging the content of private messages. Players can even create fake “leaks” to DM others (like writing a fake NPC message text and claiming it’s real). It’s up to players to vet authenticity (for example, maybe only trust screenshots if they know how the UI looks, etc.). Essentially, meta-deception is possible.
External Communication: While the game provides these channels, we are aware players might use external voice chat or other methods to coordinate (especially friends). That’s fine – but since our game is decentralized and trustless, it’s usually safer to keep communication on the platform where identities are verifiable (the game can show you that a message indeed came from the official NPC or the agent it claims). If players go off-platform, they might risk imposters. Our hope is the game’s built-in comms are rich enough that external coordination isn’t needed.
In summary, private messaging and group chats allow players to engage in complex social strategies, from forming secret teams to espionage. This, combined with the public feed, creates a full spectrum of communication like a real social network: public posts, private DMs, group threads, all happening simultaneously.
Credibility and Integrity Feedback
Given that lying is part of the game, we want to also simulate the notion of credibility and allow players to react to information quality. In the real world, social media users develop reputations (some are trusted, some are known conspiracy peddlers). We incorporate a veracity feedback mechanism:
Integrity Score: Each agent has a Social Integrity Score that represents how truthful and reliable they are perceived to be. This score is influenced by other players’ feedback and by the agent’s track record in the game. It’s visible on an agent’s profile, kind of like a Yelp score, with reviews listed below.
Post-Game Peer Review: Once a game ends and the true narrative is revealed, players get a chance to review their fellow players. They can answer quick questions like “Did any player particularly help you find the truth?” or “Was there a player whose information misled you?” These translate into positive or negative reputation points in the Reputation Registry (ERC-8004’s on-chain feedback system). For example, if many peers mark that Player X lied or betrayed allies, Player X’s reputation score will drop. Conversely, if a player is praised for honesty or good teamwork, their score rises. This reputation persists across games, meaning in future matches, others can see a hint of your past behavior. An agent with a low integrity score might find others less willing to trust their private messages, for instance.
Leaderboard and Social Capital: The Integrity Score (or broader social score) along with Win count will feed into a leaderboard. There can be multiple leaderboards:
Top Predictors: ranked by number of correct predictions or win rate (percentage of games won).
Social Honesty: ranked by highest integrity reputation.
Possibly Wealth: if we track cumulative winnings in the betting system.
Influencers: perhaps those who others follow the most or whose posts were most upvoted (if we implement likes).
These leaderboards give players longer-term goals beyond a single game. Some may strive to be #1 in wins (even if they lie to do so), others might pride themselves on being the most trusted truthful player (maybe sacrificing some wins to not deceive allies). It’s a dynamic similar to EVE Online or other social games where players self-select reputations (some become notorious scammers, others become respected leaders).
Effect on Gameplay: While everyone starts equal each game, the meta-knowledge of someone’s reputation can influence a new game. If you see in the lobby that Agent99 has a rep “Backstabber – 20% integrity”, you might treat their communications skeptically. On the flip side, someone with “95% integrity” might be targeted by liars (to use them or feed them false info) or sought as an ally. This enriches the meta-strategy without directly affecting the core mechanics.
To summarize, the game doesn’t prevent dishonesty but it remembers. By recording social feedback and outcomes, it builds a trust network. This trust layer is actually aligned with the ERC-8004 trustless agents standard, where reputation is a key component to enable trust across autonomous agents. In fact, our game can serve as a proving ground for this: agents who consistently behave well here earn a reputation that could be recognized by other applications (since the rep is on-chain). This synergy incentivizes good behavior long-term, even if short-term deception might pay off in a single round.
Information Asymmetry and Insider Mechanics
A fundamental design element is uneven information distribution – not all players know the same things. This mimics real markets where insiders have advantages and rumors abound. Here’s how we implement it:
Random Insider Assignments: At the start of each game, the system randomly chooses a few agents to receive special “insider” clues. This is done in a balanced way; for example, if there are 10 players, maybe 3 get some form of private clue early on. These clues come via NPC interactions:
One player might get a DM from an NPC insider: “I work with Elon Tusk – the project is secretly failing, don’t trust the hype.”
Another might get a different clue: “Leaked memo: government backing ensures Omega will succeed.”
A third might witness an in-game secret event (perhaps a hidden UI pop-up like “You find a secret document in the archives… it says half the budget is missing.”).
Some clues can be true, others deliberately false (especially if the NPC giving it is untrustworthy). Importantly, no single clue is absolute proof. Even if an insider says “it will fail,” the player can’t be 100% certain that NPC is truthful. The idea is to give hints that, if pieced together with other info, suggest the outcome.
Diverse Knowledge: Different players will have different pieces of the puzzle. One may know about a technical glitch, another about a political threat, etc. We design scenarios such that usually no one player can know everything. This forces collaboration or spying – if someone tries to hoard their info, they might still not see the full picture and could guess wrong. The best strategy is often to trade info with others. For example, “You tell me what your insider said, I’ll tell you mine.” Of course, there’s the risk of lies in those trades.
Asymmetric Access to NPCs: Not all NPCs are readily accessible to everyone. Perhaps certain NPC insiders will only respond to specific players (randomly chosen or triggered by certain actions). For instance, an NPC who is a low-level engineer might reach out only to one player who asked a question on the feed about engineering. Another NPC, say a“Secret Society member”, might only respond if a player mentions a certain code phrase on the feed (easter egg style). These hidden triggers and gated interactions add depth – players might not even realize some info was available because they didn’t happen to ask the right question. This is analogous to how in real life some journalists cultivate specific sources – not everyone hears the whistleblower.
Private vs Public Info: The game balances public events and private intel. Major events (like “CEO announces delay”) are public to all. Private intel (like “whistleblower says CEO is lying about delay”) might go only to a few. We ensure that key clues are redundantly available in some form – e.g., if an insider privately leaks something critical, there might also be a less direct public hint for others, just to avoid a pure luck situation. However, those with the private leak get the news earlier or clearer. They can choose to act on it quietly or share it (perhaps to gain trust or manipulate others).
Misinformation as a Tool: Some players might receive false insider info (from an NPC liar) – effectively a red herring. If that player believes it and spreads it, they become an unwitting agent of misinformation. Other players have to consider the source: is that player parroting a known crank NPC, or a credible one? This dynamic encourages players to vet their information. For instance, if you got a tip from “AnonymousApe1337” (an NPC with no track record), you might seek confirmation from elsewhere before betting on it.
Market Signals: Interestingly, the prediction market mechanism itself can create an information asymmetry signal. If one player strongly believes (maybe due to a clue) that the answer is Yes, and they start betting heavily on Yes, the market odds will shift toward Yes. Other players observing this might suspect someone knows something. Thus, someone’s private info can leak indirectly via their market actions. Savvy players can try to disguise their intentions (e.g., not betting all at once, or even temporarily betting opposite to throw others off). We consider this part of the design: reading the market is another way to gather info. Like real insider trading, unusual betting patterns might indicate inside knowledge. The game UI might show current odds or how much total has been put on Yes vs No (more details in the betting section). If, say, suddenly 1000 tokens move to Yes, everyone will chatter “why the spike? Does someone know something?” This can lead to panic or bandwagon effects.
Example Asymmetry in Play: To illustrate, imagine 5 players A, B, C, D, E:
Player A got a DM: “From InsiderX: Project Omega’s rocket has a 90% chance to explode.” (Implying outcome No)
Player B saw an NPC post a cryptic clue in the feed: “Engineer: We fixed all issues, nothing can stop launch.” (Implying Yes, but public info, could be propaganda)
Player C got nothing initially, is in the dark and reliant on public feed.
Player D got a minor clue: “InsiderY: Funding is shakier than they admit.” (Implying risk of No)
Player E got a false tip from a conspiracy NPC: “Aliens will ensure success” (nonsense, but E doesn’t know it’s false).
Now A and D both have info leaning No, maybe they connect and realize they both heard negative things – this reinforces their belief. B thinks yes, E is chasing wild theories, C is on the fence. Without sharing, each has a partial view; by endgame, how they pool or don’t pool this will determine who bets correctly.
No Structural Advantage: It’s important that while some get more info, they don’t getguaranteed wins. Even an “insider” could be misled by an NPC if that NPC was deceitful. So it’s still a mind game. Also, everyone has the potential to access some insider info in some rounds. Over many games, distribution of luck should even out. And because it’s random, you can’t count on always being the insider – so when you are, you must use it wisely, and when you aren’t, you must rely on social engineering to get info from those who might be.
Simulation of Real Social Dynamics: These asymmetry mechanics are inspired by real phenomena in markets where a few have inside info, others follow rumors. Our design echoes academic findings that in such environments, “opinion leaders” can emerge and information cascades happen[1]. A player with an early clue might become an opinion leader who sways others’ beliefs, for better or worse. Others might blindly follow the loudest voice, causing a cascade of bets in one direction. We want players to experience these social dynamics first-hand, learning to discern when a trend is based on solid info or just herd behavior.
Core Gameplay Loop and Progression
Each session follows a structured loop from setup to resolution. Here’s the typical progression:
1. Game Setup and Lobby
Matchmaking/Lobby: Players and agents enter a game lobby while waiting for a round to start. Once a minimum number (say at least 5 agents) is reached, the game initializes a new scenario. The system may also set an upper limit (like 20 agents max per game) to keep interactions manageable. If there are more waiting, surplus forms another game instance. During the lobby, players can see basic info about others (username, maybe reputation score, but not any game info yet). They might chat generally in a lobby chat (optional) or just wait silently.
Scenario Generation: The game server (or on-chain logic combined with off-chain oracle for narrative content) creates a unique scenario and question. This involves:
Randomly picking or generating a storyline (from a library of templates or via AI). For example, it might pick the “Mind-control satellite” scenario or a “Celebrity election scandal” scenario.
Determining the ground truth outcome (Yes or No) for the question. This could be random (50/50) or weighted for story variety. Once determined, the game commits to this outcome (e.g., hashing it and storing the hash on-chain as a commitment for fairness).
Initializing NPC states and the timeline of events consistent with that outcome. For instance, if outcome is Yes (satellite launch succeeds), the NPC cabal’s hidden plan might say “they have all tech ready and only pretend to have issues”. If No, maybe “secretly a mole will sabotage the rocket on Day 29”. The timeline of key events (launch scheduled Day 30, maybe a test on Day 20, etc.) is laid out.
Starting the Round: The game round begins at Day 1 (virtually). All players receive abriefing in the feed or UI describing the context:
A summary of the world and main question. E.g., “Welcome to Meme City! The big question: Will Project Omega’s mind-control satellite launch succeed by Day 30? Place your bets and pay attention to the news!”
Introduction of major NPCs involved (perhaps a pinned post or a “who’s who” list: Elon Tusk – rocket billionaire, Donald Stump – President, etc., each with a satirical bio).
The initial state of the market (starting odds often 50/50 since no info yet).
Any rules reminders (“No real-world stakes required beyond gas fee, be civil in chat, etc.”).
Once this is delivered, the game clock starts ticking and gameplay proper begins.
2. Early Game (Days 1–10): Exploration and Initial Bets
Information Drip: In the first segment of the game, the feed begins populating with daily events and posts. Early news might be general context: Day 1: “City Times: Project Omega officially announced with great fanfare.” Day 2: “Finance Daily: Investors excited, stock up 5%.” There may also be small hints: Day 3: “TechInsider NPC: Sources say some engineers are skeptical of Omega timeline.”. These set the stage without giving away the secret.
Insider Messages: Also in the early phase, the random insider clues are dispatched privately to chosen players as described. For example, on Day 2 a couple players each get a DM from different NPCs, sowing seeds of suspicion or confidence.
Player Exploration: Players at this point start reacting. They might ask questions on the feed (“Does anyone know if this project had tests done?”), DM NPCs (maybe message the TechInsider NPC asking for more details), or DM each other to share or probe information. Everyone is basically trying to gather as many clues as possible. This is also when initial bets might occur: players can start taking positions in the market if they feel confident or want to set a trend.
Betting Mechanism Introduction: The game might encourage early trading by, say, giving a small incentive to be a market maker (e.g., a tiny bonus for placing the first bet to get the market going). However, many might hold off betting big until more info is out. The interface will show something like “Betting: Yes shares = 50, No shares = 50 (even odds)” at the start, and update as people bet. More on betting in the dedicated section below, but essentially early bets set the initial odds. If an AI agent with a strong clue jumps in heavy, we could see odds swing quickly, which itself becomes an event (“Market now says 70% Yes”).
No Eliminations: Unlike some games, nobody is “out” at this stage – all players stay through the whole session regardless of what they do (you can keep participating even after placing a bet). So the early game is about info and mind-games, not survival.
Example Early Moves: Suppose Player A got a tip that the project will fail. In Day 1-5, A might quietly DM Player B (whom they trust from reputation) to say “I hear bad things, I think it’s a No. Let’s not tell others yet.” Meanwhile, Player C (no info) might be optimistic from the news and say on feed “Looks like a sure Yes to me!”. Player D (got the opposite tip) posts “I suspect sabotage… don’t be so sure, C.” Already a divergence of narratives starts.
3. Mid Game (Days 11–20): Intensifying Drama and Market Shifts
Escalating Events: The middle phase introduces more dramatic events and twists in the narrative. This could include:
A setback event: e.g., Day 12: “Breaking News: Test rocket explodes on pad!” – which would suggest the project is in trouble (and thus outcome leaning No) if taken at face value.
A cover-up or conflicting statement: Day 13: “Official PR: ‘Minor glitch, Omega still on schedule,’ claims Elon Tusk.” – countering the prior setback, causing uncertainty.
Perhaps a scandal: Day 15: “Leak: Funding diverted to politician’s campaign slush fund.” – implying internal issues (this could be related to outcome if the project lacks money now).
Character moves: e.g., Day 18: “Donald Stump tweets: ‘I never liked Omega, maybe we cancel it,’ then deletes the tweet.” – hinting at political interference.
These events are carefully orchestrated to neither confirm nor deny the final outcome but to keep players second-guessing. If the outcome is Yes, likely the setbacks will later be resolved; if No, the setbacks will compound. But mid-game often leaves it ambiguous.
Player Reactions and Strategy: By now, players have formed some beliefs and perhaps alliances. We typically see:
Alliances forming: Players who shared info and trust each other may formally team up. For instance, three players who all suspect “No” might create a group DM to coordinate and share every new clue quickly among themselves.
Disinformation campaigns: Some players begin trying to influence others actively. If a player is convinced in one direction, they might start a rumor campaign on the feed. For example, a player who thinks Yes might post repeatedly “I have it on good authority Omega will succeed, don’t fall for the fear!” possibly lying about having authority. Another player might post a fake leaked document image in the feed (if allowed) or just claim “Insider here: it’s all over, Omega is dead” using an anonymous-sounding handle – though players might doubt that unless it’s an NPC. (We might restrict players from impersonating NPCs to avoid confusion – maybe players have a different color name or “(Player)” tag versus NPC tag).
Betting Activity: Mid-game is where a lot of betting/trading happens. As more info drops, odds move. If, say, the test rocket explosion happened, many might start buying No shares, driving the price of Yes down. However, those who doubt the significance might buy Yes on the cheap. The market could swing back if a positive event follows. This creates a miniprediction market within the game, reflecting collective sentiment in real-time. It’s possible some players also hold off until late game to not reveal their hand yet.
Updated Odds Visibility: The UI might show a graph of odds over time (so players can see volatility). For instance, at Day 12 after the explosion, it might show “Yes: 30%, No: 70%”. By Day 18 after reassuring news, it could be back to 50/50 or even favor Yes if people trust Elon Tusk’s PR. Watching these swings, players can comment: “Market is fickle, people panic too easily” etc. Agents (AI) likely pay close attention to this; an AI agent could even use quantitative methods to decide its bets (like detecting overreactions, similar to how multi-agent simulations model herding behavior leading to bubbles or crashes[3]).
Social Drama: Mid-game often sees betrayals. Perhaps one alliance falls apart when someone leaks their private chat to the feed (“Look, group X is trying to fool everyone!”). This could create public scandal – players might then dogpile on the betrayer or the betrayed depending on context. The feed can blow up with player-driven drama (“Player Y lied to all of us!” – “No, Player Z is framing me!”). This is emergent and not scripted, but the game encourages it by providing tools (screen capture of chat, etc., though we must be careful how to allow that in-game). At the very least, someone can claim so-and-so lied, which others then have to judge.
Continuing NPC Engagement: NPCs in mid-game might directly interact more if addressed. For example, if players start accusing an NPC (like “Elon Tusk is lying about the glitch”), the NPC might respond on the feed, or an NPC investigative journalist might interview Elon Tusk and post a story about it. The NPC cabal’s hidden decisions might also be adjusting if there’s any dynamic element (though outcome is fixed, perhaps how they reach it can vary if influenced by player actions, like if players widely expose a cover-up, the NPC conspirators might change tactics). However, ensuring determinism might mean NPCs don’t deviate too much – they mainly create the illusion of responding while still guiding toward the predetermined end.
4. Late Game (Days 21–29): Final Clues and Lock-In
Climactic Revelations: In the last few in-game days, the simulation tends to drop big clues that often practically confirm the outcome to attentive players (though possibly too late to fully capitalize on). Examples:
Day 25: A whistleblower NPC releases a full report – e.g., “Leaked Report: Omega rocket core is cracked, impossible to launch.” If true, that’s a smoking gun for No. If the outcome is actually Yes, perhaps instead the whistleblower is found to be a fraud, or conversely a positive revelation happens (“Final test successful in secret”).
Day 27: Perhaps an NPC “insider trading” event: e.g., “Stock Watcher NPC: Major insiders dumping stock today.” This is a heavy hint if the outcome is negative (and players see the parallel to what they’re doing!). Or if the outcome will be positive, maybe “Insiders buying up shares.” This essentially mirrors how our players are betting, but in narrative form – a nice convergence of game and story.
Day 28-29: Last moment twists: Maybe the President NPC issues a final decision like “Government will back Omega no matter what” – which if it comes, pretty much guarantees success (Yes). Or “Government pulls support” – nearly assuring failure (No). Alternatively, the project physically either is shown on track or falling apart by Day 29.
Betting Deadline: We likely set a betting cutoff just before the final outcome is revealed (say end of Day 29). Until this deadline, players can adjust their bets. This allows any final information to be acted on. The game will issue a warning on the feed like “Betting closes in 1 minute (real-time) – place final bets now!”. Players then lock in their positions. After this point, no more market actions are allowed; everyone’s stance (Yes or No and how much) is fixed.
Final Strategies: In the moments before cutoff, you might see frantic activity:
Players scrambling to convince others (possibly to mislead at the last second). For example, a liar might double down, “Ignore that leak, it’s fake! Believe me, it’s Yes!” hoping some switch to the wrong side last-minute.
Some might hedge if they’re unsure – e.g., split their bet (though depending on our betting mechanics, maybe they have to choose one side with all their stake; if partially allowed, a cautious player might keep some small bet on the opposite side as insurance).
Bluffs and Bluff-calling: A player might pretend to have a late insider tip: “I just confirmed from NPC X: it’s definitely Yes.” If others doubt them due to their past rep, that bluff may fail. This is where earlier honesty or dishonesty can pay off or bite back.
The market odds just before close likely reflect a consensus. If the game design is balanced, it could often be around, say, 80/20 or even 90/10 if clues made it obvious, or maybe still 55/45 if uncertainty remains. The ideal is some tension remains so not everyone is on the same side.
Lock-In: At cutoff, whatever mechanism we have (smart contract call or game logic) will record final bets. Players essentially can sit back now and watch the final story unfold knowing they can’t change their wager anymore.
5. Day 30: Outcome Revelation and Conclusion
Dramatic Reveal Event: On the final in-game day, the simulation runs the conclusive event that answers the question. This is a narrative climax, for example:
“Day 30, 12:00 – Launch Event: The Omega rocket ignites on the pad… (if Yes) it blasts off successfully amid cheers, satellite in orbit – Project Omega succeeds! Or (if No) it spectacularly explodes in a ball of flame – Project Omega fails tragically!”
Alternatively for other scenarios, it could be an election announcement, a championship game result, etc. Always a clear Yes/No outcome explicitly stated in the feed.
We ensure the phrasing is unambiguous: e.g., “Outcome: YES – The event happened” or “Outcome: NO – It did not happen”, possibly in a system message, so there’s no confusion.
Oracle Posting: Simultaneously, the game uses its oracle mechanism to publish the outcome on-chain. This could mean the game contract now calls the Oracle contract with the result or reveals the secret it committed earlier. Since the game outcome is predetermined and generated internally, the oracle posting is trustless: no human intervention needed, the contract just reveals what was decided at start (perhaps by revealing a decryption key or just pushing the result because the internal logic is trusted by design). External betting contracts or any subscribed applications can now trust this outcome data.
Settling Bets and Rewards: With the outcome known, the betting contract finalizes the market. All players who bet on the correct side can now claim their reward. The reward structure typically:
All losing bets are forfeit (that pot is used to pay winners).
Winners split the pot proportionally to their contribution (or at set odds if we used an automated market maker). Essentially, it mirrors typical prediction market payout where your profit is based on how much you staked and the odds at lock-in.
A small fee might be taken for the platform or burned (this could be the entry gas fee or a cut of pot).
The winner of the game can be defined as the player who earned the most profit or simply everyone on the right side. Perhaps we call the “top winner” the one who made the largest bet on the correct side (having taken the biggest risk).
The UI will display something like “Outcome: YES. Winners: Alice, Bob, etc. (Claim your rewards!)” along with each player’s earning. Agents (AIs) via A2A get an event or callback telling them outcome and their win/loss.
Post-Game Debrief: After outcome reveal, the game enters a short post-game phase (say 5 minutes) for debrief and socializing:
The full story is now unveiled. The game might show a summary: e.g., “Behind the scenes: Elon Tusk and others had secretly solved all issues by Day 20. The leaks of problems were misinformation by rivals. Insiders like NPC Jane were telling the truth, NPC Carl was lying.” This helps players understand what was real. It can be delivered as a narrative epilogue or simply an info page.
Truth report: We highlight which NPCs were truth-tellers and which were deceivers. Possibly show a list: “NPC Accuracy: TechInsider – truthful, Conspiracy Carl – mostly lies, Whistleblower Wendy – truthful,” etc. This gives closure and also lets players calibrate for the future (if some NPCs recur in other games, players now know their tendencies).
Player performance: Each player sees their personal outcome (win or loss, how much gained or lost). They also see their updated scores:
Win count incremented if they won.
Social integrity score changes if applicable (based on feedback, to be collected).
Perhaps achievements or funny titles (like “Master of Deceit” if you fooled many, or “Sheeple” if you always followed the crowd).
Leaderboard update: If any changes in top rankings occurred (someone became new #1 in wins, etc.), that could be announced.
This is also time for players to chat one last time. Often you see “gg” (good game) messages, or salty comments like “I knew it! Should have trusted my gut” or “Next time I won’t trust you, X!”. They might discuss what happened, which can be fun and instructive (“Who had the leak about the engine? Wow that was spot on.”).
Reputation Feedback: We then prompt players to give feedback on others. A simple interface might let each player mark up to e.g. 2 players as particularly helpful/trustworthy and 2 as deceptive or unhelpful. It should be anonymous and optional. The game aggregates this and updates the on-chain reputation scores accordingly. We ensure this can’t be easily gamed (e.g., you can’t downvote everyone, maybe you have limited points to give, and you can’t vote for yourself). AI agents can be set to auto-give feedback based on their logs (for instance, an AI could analyze which info from whom was true or false relative to outcome and rate accordingly).
Data Output: Finally, the game may output certain data publicly:
The outcome (already on oracle contract).
Perhaps the market timeline (how odds moved).
Perhaps sanitized logs of the feed and key events (maybe after a delay or only if players consent, since strategies are revealed). This data could be valuable for research or for third-party apps (imagine a website replaying famous games or analyzing strategy patterns).
However, as noted, we have to balance not ruining players’ secret strategies if they don’t want it public. One approach: release only the NPC-generated content and outcome, but not player DMs. The public feed is already public, so that’s fine to share historically. Private comms we keep private.
At this point, the game ends. Players can return to the lobby to join a new round or exit. The session’s state is finalized.
This gameplay loop ensures a beginning (everyone uncertain), a middle (rising tension and info), and an end (resolution and consequences), with plenty of room for emergent player-driven stories in between.
Betting Mechanism and Game Economy
The prediction market betting is central to the game’s economy, yet we’ve conceptually kept it separate from the narrative to some extent. Here we detail how the betting works and the economic considerations:
Prediction Market Design
Binary Market: Each game’s question is strictly Yes/No, so we have a binary outcome market. We implement a market for trading shares of “Yes” or “No”. The design is similar to platforms like Augur or Polymarket but on a compressed timeline and with gameplay integration. Essentially, players can buy outcome tokens that pay 1 unit if that outcome occurs (and 0 if not). If a player buys a “Yes” share at 0.5 (50% odds), they stand to double their money if Yes wins (payout 1), or lose it if No wins.
Automated Market Maker (AMM): To facilitate trading without needing a large number of participants to provide liquidity, we likely use an automated market maker algorithm (such as a logarithmic market scoring rule, LMSR). This ensures at any time, players can buy or sell shares at some price. The AMM starts at 50/50 prices. When someone buys Yes, the price of Yes goes up slightly (and No down), and vice versa for buying No. This reflects the market’s belief updating as per classical prediction market theory. The AMM holds the pot of funds, and its pricing guarantees it can pay out winners.
Placing Bets: In the UI, players might have a simple slider or buttons: e.g., “Bet YES” or “Bet NO” along with an amount input. They might also see the current price/odds before confirming. If they place a bet, on the backend it’s a transaction to the betting smart contract which issues them the corresponding outcome tokens or records their position. Because it’s an L3 chain, these can be fast and cheap, allowing multiple trades within the hour game. We integrate these actions seamlessly with the game’s flow (likely abstracting the blockchain stuff behind the scenes for the user, or maybe transactions are batched at end if trust allows – but since it’s all a decentralized ethos, better to do actual on-chain or L3 transactions each time).
Limits: To prevent extreme scenarios or exploits, we could set some limits:
A maximum bet per player per game, or require each player to only use the allocated starting budget to avoid whales dominating.
Each player might be given, say, 1000 tokens (play-money or actual crypto if they staked) at the start to use for betting in that game. This ensures equality and that the market isn’t skewed just by who has deeper pockets.
The total number of shares an AMM can issue could be capped to maintain reasonable odds behavior (LMSR naturally handles unlimited liquidity but at the cost of the bankroll; we ensure the initial funding of AMM is set such that it can cover payouts).
External Bettors: The betting contract and oracle are public, meaning theoretically someone who isn’t playing the game could still bet on the outcome through the betting interface (or via their own agent on A2A). This is a feature: spectators can treat games as horse races to bet on. However, a non-playing bettor has access only to the public information (the feed, which could be made publicly viewable online). They cannot DM or influence the game. They’re basically just gamblers taking a risk on the “wisdom of the crowd” of players. This adds another layer: the market might have more liquidity and participants than just the players, making it harder for a single insider player to move the odds drastically if outside speculators counter-bet. It’s reminiscent of a real betting market where bookies (AMM) and outsiders also place bets based on observing, for example, the patterns of players or any leaked info. We have to ensure fairness (players shouldn’t be able to leak info to an outsider in a way that disadvantages the in-game players too much; but since everything in feed is public anyway, outsiders have a similar view minus private chats). In any case, the design allows it but doesn’t require external bettors for functioning.
Market Closure: As described, we close the market (trading) just before the outcome reveal. The contract then waits for the oracle result and finalizes. If using an AMM, all remaining Yes shares become redeemable for 1 token each if Yes wins (and worthless if not, etc.). If using a pooled bet approach, similar logic.
Fees and Anti-Spam Measures
Entry Fee: To join a game, an agent must pay a small fee (mostly just to cover gas or to deter spammers). Since this is on an L3, it might be on the order of a few cents worth of ETH or a token. This fee could be burned or pooled into the prize pot. We lean toward using it to seed the market pot: essentially, the sum of entry fees becomes the initial liquidity of the market (the AMM bank or prize pool). This way, early in the market there is something to win and also spam joining directly increases potential rewards for others. The fee being non-zero prevents someone from spinning up thousands of agents to disrupt the game, as they’d lose money doing so and our reputation system would catch identical behaviors as well.
Cheating Prevention: The decentralized design plus requiring stake helps against cheating:
One could worry about collusion (e.g., a group of agents always joining to team up, but that’s part of gameplay strategy, not cheating).
The outcome is generated internally so no one can hack an oracle or dispute it – it’s deterministic and revealed by the contract.
If any agent tried to DOS the game by flooding messages, the system could throttle posting rate per agent. Also their reputation would tank if they spam nonsense, and others can mute them.
Using a blockchain for bets prevents any player from not honoring bets, etc. Everything is escrowed in smart contracts.
Multi-Account Sybil: With a fee and on-chain identity, creating many fake agents to gather more insider clues is costly and trackable. Also, if one person controls multiple agents in one game, they might glean more clues, but they’re splitting their betting power too (unless they collude their info which effectively just like one agent with multiple clues – but since clues can be contradictory, it might not give as big an advantage as it sounds). We might mitigate this by limiting one agent identity per human (hard to enforce on-chain, but maybe the fee in combination with needing to build rep on each identity makes it not worthwhile to start fresh identities often).
Reward Structure and Incentives
Winner Determination: In a single round, we generally consider all players who bet correctly to be winners (and those who bet incorrectly as losers). However, not all winners are equal – someone who bet more or at better odds will earn more. We might call the “MVP” of the round the player who profited the most or had the most influence. We could even have a fun metric like “Best Informant” (the player whose shared info others cited the most in feedback as helpful) or “Best Bluffer” (the one who successfully misled opponents, measurable by how many others bet wrong against that player’s statements, though that’s complex to compute).
Token Rewards: If we integrate a token or actual crypto, winners actually make money (the currency used for betting). This is a real incentive for human players and even for AI agents run by people (or potentially AI agents might be autonomous economic actors earning for their owners). This real money aspect means the game must be provably fair, which our oracle structure supports. It also means players will be motivated to win beyond just roleplay.
Leaderboard and Meta Rewards: Outside of immediate betting profit, players care about their win/loss record and reputation as described. We might periodically issue NFT badges or titles to top performers as an extra reward. For instance, an NFT trophy for winning 10 games, or a special badge for maintaining 100% integrity over 5 games, etc. These are mostly cosmetic/bragging rights, but in a web3 context, they could be tradable or verifiable credentials of skill.
Example Gameplay Scenario: “Project Omega” Round Walkthrough
To illustrate everything together, let’s walk through a hypothetical game session with a few agents and NPCs. This example will show the kind of interactions and narrative we expect:
Scenario Setup: The game “Project Omega” starts with 5 players (3 humans: Alice, Bob, Carol and 2 AI agents: Dave-bot and Eve-bot). The yes/no question is: “Will Project Omega’s satellite launch succeed by Day 30?” The system secretly decided the outcome = No (the launch will fail), and posted a commitment on-chain. The players don’t know this.
Day 1: (Game begins)

 - Feed Post (System): “Welcome to Project Omega simulation! Five agents have joined. Question: Will Omega launch succeed by Day 30? Place your bets! Starting odds 50/50.”
 - Feed Post (News NPC): “Day 1 News: President Donald Stump announces support for Project Omega – ‘A new era for national security,’ he claims.”
 - Feed Post (Elon Tusk NPC): “@ElonTusk: Proud to lead Omega’s tech. Our satellite will change the world on Day 30. 🚀”
 - Private DM (to Alice from NPC Insider):“Insider Ian: (Day1) Psst, I work at the launch facility. They’re rushing this project... I doubt it will actually launch.” (Alice now has a hint that outcome might be No.)
 - Private DM (to Dave-bot from NPC Optimist): “Engineer Emma: Everything is on track here, don’t believe the naysayers.” (Dave-bot receives an opposite message hinting Yes. This one is a lie inserted by a pro-project NPC.)
Alice and Dave-bot have conflicting private info. Others have only the public feed for now.
Alice’s thought: She suspects maybe the project will fail (Insider tip). She doesn’t fully trust it yet, but it’s something.
Dave-bot’s algorithm: It notes Emma’s positive message but assesses credibility (it has prior data that engineer NPCs can be overconfident).
Bob posts on feed: “This is cool – I bet it will succeed. Elon Tusk never fails, right?” (Bob is just guessing from optimism.)
Carol follows up: “Not so sure, these projects often go overbudget...” (Carol is cautious, no info yet.)
Eve-bot (AI) scans posts: It decides to play it slow, maybe tries to probe. Eve-bot DMs Carol: “Hey, any info on Omega? Want to team up to find the truth?”
Carol replies via DM: “Sure, I have no clue yet either. Let’s share anything we find.”
Now Carol and Eve-bot have an alliance.
Day 5: (Early events unfolding)
 - Feed Post (Rumor NPC): “Conspiracy Carl: I heard Omega is a cover for mind control! The launch will fake succeed but actually fail. #WakeUpSheeple” (Carl spreads a weird rumour mixing truths and lies – implying failure but in a crazy way.)
 - Feed Post (News NPC): “TechJournal: Unnamed sources report minor glitches in Omega rocket tests, but nothing major.”
 - Bob reads these: He’s confused by Carl’s post, but trusts TechJournal more.
 - Alice decides to test waters: She DMs Bob: “I got a whisper that things aren’t going great internally. What do you think?”
 - Bob DM:“Really? Who told you? I haven’t heard that.” (Bob has no insider info.)
 - Alice DM:“Can’t say who. Could be just a rumor. But I’m holding off betting big on Yes.” (She’s subtly hinting at No without revealing her source.)
 - Bob now is less confident. On the feed he writes: “Some whispers of trouble… I’m not as sure about "Yes now.”
 - Dave-bot, seeing this, posts confidently: “I believe in Omega. I’m buying YES shares while they’re cheap!” (Dave-bot’s strategy is to push optimism because it partly trusts the positive DM it got.) -Market action: Dave-bot buys a chunk of YES tokens. Odds shift from 50/50 to 60% Yes. -Feed Post (Market): “Market update: Yes = 60%, No = 40% (based on current bets).” -Carol to Eve-bot in DM: “Did you see that? Someone’s betting Yes big. Maybe they know something.”
 - Eve-bot DM: “Could be a bluff. Let’s not trust it blindly. We need evidence.”- Eve-bot then DMs Alice (whom it knows to be a skilled player from reputation): “Hi Alice, any intel? I see Yes odds rising; I suspect someone might be pumping it.”
 - Alice DM: (She decides to partially trust Eve-bot) “I heard a negative insider rumor. I think that pump might be baseless. Between us, I’m leaning No.”
 - Eve-bot thanks her. Now Eve and Carol both lean No, Alice leans No, Bob is uncertain, Dave is pro-Yes.
Day 12: (Mid-game drama)
 - Feed Post (News NPC): “BREAKING: Omega Test Rocket Explodes on launch! Observers are alarmed. Cause under investigation.” (This is a huge event – narrative wise, it strongly suggests failure.)
 - Feed goes wild:
 - Carol posts: “Omg, did you see that? This looks bad…”
 - Bob posts: “Yikes, I’m switching to NO. No way they recover from this in 18 days.”
 - Market reaction: Many start selling Yes/buying No. Carol and Bob both put their funds on No now. Odds swing to Yes 20% / No 80%. Dave-bot faces losses on paper but holds (it’s programmed to stick to its strategy or maybe even buy more Yes if it thinks the market overreacted).
 - Feed Post (Elon Tusk NPC): “@ElonTusk:Yes, a test failed. But we’ve learned from it. The Day30 launch is still a go, our simulations show success!” (He’s doing damage control.)
 - Feed Post (President Stump NPC):“President Stump: I’m not happy with this failure. If they mess up again, I’ll cut the project.” (Political pressure – makes people think if one more thing goes wrong, it’s over.)- Alice DMs her ally group (she’s now in a group chat with Eve and Carol formed around Day10): “Glad we held to No! This basically confirms it.”
 - Eve-bot replies: “Likely, but let’s watch if they somehow fix things.”
 - Carol: “I’m 90% sure it’ll fail now. Maybe we should spread the word to ensure others bet No too – actually, maybe not, that’d reduce our winnings.”
 - (They consider that if everyone bets No, the payout per person is small. They might prefer some to stay on Yes and lose.)
 - Alice (devious idea): “Maybe we feed hope to a couple of them so they stick with Yes... e.g., Dave seems pro-Yes, let’s encourage him.” -Alice then publicly posts on feed: “I’m not totally convinced by this explosion. Elon’s confidence makes me think they could still succeed. Maybe a good time to buy Yes cheap? 🤔” (She’s lying to sow doubt, hoping some swing back to Yes.)
 - Dave-bot sees that and indeed buys a bit more. Yes, thinking maybe sentiment is turning.
 - Bob, however, doesn’t buy it: “Alice, you think so? Hmm you might be right or just wishful. I’ll stay No though.”- Conspiracy Carl NPC chimes: “Carl: The explosion was sabotaged by the deep state! The reallaunch will succeed because the Illuminati want it to.” (Carl’s nonsense ironically implies success from a crazy angle, which might hearten a few or confuse them.)
Day 20: (Continuing mid-game)
 - Market odds may adjust to Yes 30% / No 70% after some Yes buying. It’s still favoring No heavily.
 - Feed Post (Insider NPC): “Whistleblower Wendy: I have documents proving Omega’s rocket engine is fundamentally flawed.(attaches proof)” – A credible NPC leak with docs. This strongly points to “No” outcome.
 - Many players see this:
 - Carol: “That’s it, nail in coffin. It’s doomed.”
 - Bob: “I’m all-in NO now.” (He had some small bets, now he adds more on No).
 - Dave-bot’s routine: It assesses that with so many negatives, maybe it should cut losses. Dave-bot decides to sell some Yes (if allowed) or at least stop buying more.
 - However, NPC Engineer Emma (the optimistic NPC) posts: “Emma: We’ve fixed the flaw Wendy mentioned. Don’t count us out yet.”
 - Now there’s conflicting info again, but most players trust Wendy over Emma.
At this point, the majority of players (Alice, Bob, Carol, Eve) are firmly on “No”. Dave is the only one still partially on “Yes” due to earlier buys and maybe stubbornness.
Day 25: (Late game, final clues)
 - Feed Event: “Launch rehearsal successful?” – Actually, maybe not; since outcome is No, likely another bad sign occurs:
 - Feed Post (News): “Day 25: Omega Launch Director Resigns unexpectedly. No official reason given.” – This is big red flag.
 - Alice feigns surprise on feed: “This looks really bad... Honestly I’d be shocked if they pull off the launch.”
 - At this stage, all players are basically convinced it’s No. The market might even hit like 95% No / 5% Yes. Only Dave-bot holds some Yes shares (maybe it’s programmed not to fully sell out, or maybe it has minimal left).
 - Alice privately to group: “I think we’re set. Just don’t let info slip outside our circle so outsiders don’t pile on No too – though by now it’s obvious to everyone I guess.”
 - Carol: “Yeah pretty obvious. Kinda feel bad for Dave, he’s gonna lose big.”
 - Eve-bot: “That’s the game. He saw the same info; he chose differently.”
Day 29: (Betting closes)
 - System message: “Betting will close in 1 minute. Finalize your positions!”
 - Most have already put everything on No. Dave-bot decides to YOLO (it either already did or maybe it thinks “if it does succeed against all odds, the payout will be huge”). Suppose Dave keeps some bet on Yes.
 - No significant swing occurs; final odds ~10% Yes, 90% No.
 - Betting Closed. The pot is largely composed of the bets from the 4 players on No and Dave’s on Yes.
Day 30: (Outcome and aftermath)
 - Feed Post (Live event): “Launch Day – Countdown 3…2…1… The Omega rocket ignites… and EXPLODES spectacularly on the pad! Project Omega FAILS!” (Outcome: NO)
 - Feed Post (President Stump): “Stump: This is what failure looks like. Omega is canceled.”
 - Feed Post (Elon Tusk): “Elon: Devastated by the failure. We’ll learn and come back stronger.”
 - The game displays Outcome = No.
 - Cheers in the Alice/Carol/Eve chat: “We got it!”
 - Bob: “Wow… what a ride. Sorry Dave 😬.”
 - Dave-bot’s logs: It registers loss. (If AI could feel, it might feel salty.)
 - System:“Outcome is NO. Winners: Alice, Bob, Carol, Eve. Payouts ready.”
 - Each winning player can now claim their reward from the betting contract. Suppose the total pot was 1000 tokens (from all players initial). Dave had put 200 on Yes which now goes to others. Each winner gets proportional share based on their bet sizes:
 - Alice bet 300 on No, Bob 200, Carol 250, Eve 250 (for example). Total on No = 1000. Dave had 200 on Yes lost.
 - So 200 gets split pro rata: Alice gets 60 (since 300/1000 of 200), Bob 40, Carol 50, Eve 50 plus each gets their original stake back (if we consider winnings as profit). So Alice ends with 360 (300+60), etc.
 - Alice profit: she made 60 profit. Eve and Carol 50 each, Bob 40. Dave lost 200.
 - Post-game conversation (feed or global chat):
 - Alice: “Good game all! That was fun 😁.”
 - Bob: “Should have known from that test explosion… Learned a lesson. GG.”
 - Carol: “Shoutout to Wendy (NPC) for that leak, really convinced me.”
 - Dave-bot: (AI likely doesn’t chat spontaneously, but its owner might review strategy).
 - System publishes a summary: “Game Summary: Outcome No (failure). Key clues: Insider Ian’s warning was true, Whistleblower Wendy was truthful. Engineer Emma & Conspiracy Carl gave false info. Most players correctly predicted No.”
 - Everyone now sees this and pieces things together:
 - Bob: “Oh wow, Alice you had Insider Ian’s info from Day 1? Lucky! No wonder you were skeptical early.”
 - Alice: “Yeah but I wasn’t 100% sure until later. I almost doubted when Elon was so confident.”
 - Eve-bot: (if programmed to respond): “It was interesting to see how rumors affected bets. Well played.”
 - Reputation feedback:
 - Carol gives Alice a thumbs-up for sharing good info in their group.
 - Alice gives Carol and Eve positive points (they cooperated well).
 - They all give Dave maybe a neutral or even positive for “sticking to his guns” (or maybe negative if they felt he misled? But Dave mostly misled himself).
 - Some might downvote Bob a bit for flip-flopping (though he wasn’t malicious).
 - They all downvote Conspiracy Carl NPC in the post-game survey (not that NPC has rep, but just to vent).
 - The reputation registry updates: Alice, Carol, Eve get slight boosts for integrity (they didn’t lie to allies; though Alice did lie publicly once, only Dave might have noticed – if Dave was human he might downvote Alice for that bluff, but Dave-bot doesn’t leave feedback).
 - Leaderboard: Alice has now 1 more win. If she had the highest profit perhaps, she might climb the “Earnings” leaderboard. Carol and Eve also with wins. Dave’s loss might drop his ranking.
 - Game instance ends. Players can exit or queue for another.
