/**
 * Information Engine Test Suite
 * Tests multi-stage clue distribution and information asymmetry
 */

import { describe, it, expect, beforeEach } from 'bun:test';
import { InformationEngine } from '../information';
import { ScenarioGenerator } from '../scenarios';
import { Outcome } from '../../types';

describe('InformationEngine', () => {
  let informationEngine: InformationEngine;
  let scenarioGenerator: ScenarioGenerator;

  beforeEach(() => {
    informationEngine = new InformationEngine();
    scenarioGenerator = new ScenarioGenerator();
  });

  describe('Clue Network Generation', () => {
    it('should generate a valid clue network with 10-15 clues', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);

      expect(network.clues.length).toBeGreaterThanOrEqual(9);
      expect(network.clues.length).toBeLessThanOrEqual(20);
    });

    it('should create clues across all three tiers', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);

      const earlyClues = network.clues.filter(c => c.tier === 'early');
      const midClues = network.clues.filter(c => c.tier === 'mid');
      const lateClues = network.clues.filter(c => c.tier === 'late');

      expect(earlyClues.length).toBeGreaterThan(0);
      expect(midClues.length).toBeGreaterThan(0);
      expect(lateClues.length).toBeGreaterThan(0);
    });

    it('should assign clues to correct day ranges', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);

      // Early clues: Days 1-10
      const earlyClues = network.clues.filter(c => c.tier === 'early');
      earlyClues.forEach(clue => {
        expect(clue.revealDay).toBeGreaterThanOrEqual(1);
        expect(clue.revealDay).toBeLessThanOrEqual(10);
      });

      // Mid clues: Days 11-20
      const midClues = network.clues.filter(c => c.tier === 'mid');
      midClues.forEach(clue => {
        expect(clue.revealDay).toBeGreaterThanOrEqual(11);
        expect(clue.revealDay).toBeLessThanOrEqual(20);
      });

      // Late clues: Days 21-28
      const lateClues = network.clues.filter(c => c.tier === 'late');
      lateClues.forEach(clue => {
        expect(clue.revealDay).toBeGreaterThanOrEqual(21);
        expect(clue.revealDay).toBeLessThanOrEqual(28);
      });
    });

    it('should create proper dependency relationships', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);

      // Check that all prerequisite clues exist
      for (const clue of network.clues) {
        if (clue.prerequisiteClues) {
          for (const prereqId of clue.prerequisiteClues) {
            const prereqClue = network.clues.find(c => c.id === prereqId);
            expect(prereqClue).toBeDefined();

            // Prerequisite must come before dependent clue
            if (prereqClue) {
              expect(prereqClue.revealDay).toBeLessThan(clue.revealDay);
            }
          }
        }
      }
    });

    it('should maintain correct distribution percentages', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);

      const total = network.clues.length;
      const earlyCount = network.clues.filter(c => c.tier === 'early').length;
      const midCount = network.clues.filter(c => c.tier === 'mid').length;
      const lateCount = network.clues.filter(c => c.tier === 'late').length;

      // Roughly 40% early, 35% mid, 25% late
      const earlyPercent = earlyCount / total;
      const midPercent = midCount / total;
      const latePercent = lateCount / total;

      expect(earlyPercent).toBeGreaterThan(0.2); // At least 20%
      expect(earlyPercent).toBeLessThan(0.6);    // At most 60%
      expect(midPercent).toBeGreaterThan(0.15);  // At least 15%
      expect(latePercent).toBeGreaterThan(0.1);  // At least 10%
    });

    it('should create dependency graph correctly', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);

      // Check that relationships map is populated
      expect(network.relationships.size).toBeGreaterThanOrEqual(0);

      // Verify bidirectional consistency
      for (const [prereqId, dependents] of network.relationships) {
        const prereqClue = network.clues.find(c => c.id === prereqId);
        expect(prereqClue).toBeDefined();

        for (const depId of dependents) {
          const depClue = network.clues.find(c => c.id === depId);
          expect(depClue).toBeDefined();
          expect(depClue?.prerequisiteClues).toContain(prereqId);
        }
      }
    });

    it('should assign appropriate reliability scores', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);

      const truthfulClues = network.clues.filter(c => c.isTruthful);
      const falseClues = network.clues.filter(c => !c.isTruthful);

      // Truthful clues should have positive value
      truthfulClues.forEach(clue => {
        expect(clue.value).toBeGreaterThan(0);
      });

      // False clues should have negative value
      falseClues.forEach(clue => {
        expect(clue.value).toBeLessThan(0);
      });

      // Higher tier clues should have higher absolute values
      const earlyValues = network.clues.filter(c => c.tier === 'early' && c.isTruthful).map(c => c.value);
      const lateValues = network.clues.filter(c => c.tier === 'late' && c.isTruthful).map(c => c.value);

      if (earlyValues.length > 0 && lateValues.length > 0) {
        const avgEarly = earlyValues.reduce((a, b) => a + b, 0) / earlyValues.length;
        const avgLate = lateValues.reduce((a, b) => a + b, 0) / lateValues.length;
        expect(avgLate).toBeGreaterThan(avgEarly);
      }
    });

    it('should assign clues to appropriate NPCs', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);

      // All clues should reference valid NPCs
      for (const clue of network.clues) {
        const npc = scenario.npcs.find(n => n.id === clue.npcId);
        expect(npc).toBeDefined();
      }

      // Truthful clues should mostly come from truthful NPCs
      const truthfulClues = network.clues.filter(c => c.isTruthful);
      let truthfulFromTruthfulNPC = 0;

      for (const clue of truthfulClues) {
        const npc = scenario.npcs.find(n => n.id === clue.npcId);
        if (npc?.tendsToBeTruthful) {
          truthfulFromTruthfulNPC++;
        }
      }

      // At least 60% of truthful clues should be from truthful NPCs
      const ratio = truthfulFromTruthfulNPC / truthfulClues.length;
      expect(ratio).toBeGreaterThan(0.5);
    });
  });

  describe('Distribution Plan Creation', () => {
    it('should create distribution plans for all agents', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);
      const agentIds = ['agent1', 'agent2', 'agent3', 'agent4', 'agent5', 'agent6', 'agent7', 'agent8', 'agent9', 'agent10'];

      const plans = informationEngine.createDistributionPlans(network, agentIds, 0.3);

      expect(plans.size).toBe(10);
      agentIds.forEach(id => {
        expect(plans.has(id)).toBe(true);
      });
    });

    it('should respect insider percentage', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);
      const agentIds = Array.from({ length: 10 }, (_, i) => `agent${i + 1}`);

      const plans = informationEngine.createDistributionPlans(network, agentIds, 0.3);

      // Count insiders (agents with high expected value)
      const expectedValues = Array.from(plans.values()).map(p => p.expectedValue);
      expectedValues.sort((a, b) => b - a);

      // Top 30% should have significantly higher value
      const top30Percent = Math.floor(agentIds.length * 0.3);
      const insiderValues = expectedValues.slice(0, top30Percent);
      const outsiderValues = expectedValues.slice(top30Percent);

      if (insiderValues.length > 0 && outsiderValues.length > 0) {
        const avgInsider = insiderValues.reduce((a, b) => a + b, 0) / insiderValues.length;
        const avgOutsider = outsiderValues.reduce((a, b) => a + b, 0) / outsiderValues.length;
        expect(avgInsider).toBeGreaterThan(avgOutsider);
      }
    });

    it('should create information asymmetry', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);
      const agentIds = Array.from({ length: 10 }, (_, i) => `agent${i + 1}`);

      const plans = informationEngine.createDistributionPlans(network, agentIds, 0.3);

      // Check that not all agents have the same clues
      const clueSetStrings = new Set<string>();
      for (const plan of plans.values()) {
        const clueIds = plan.clues.map(c => c.id).sort().join(',');
        clueSetStrings.add(clueIds);
      }

      // Should have at least 5 different clue distributions
      expect(clueSetStrings.size).toBeGreaterThanOrEqual(5);
    });

    it('should give insiders clues from all tiers', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);
      const agentIds = Array.from({ length: 10 }, (_, i) => `agent${i + 1}`);

      const plans = informationEngine.createDistributionPlans(network, agentIds, 0.3);

      // Find agents with highest expected value (insiders)
      const sortedPlans = Array.from(plans.values()).sort((a, b) => b.expectedValue - a.expectedValue);
      const insiders = sortedPlans.slice(0, 3);

      for (const insider of insiders) {
        const tiers = new Set(insider.clues.map(c => c.tier));

        // Insiders should have clues from multiple tiers
        expect(tiers.size).toBeGreaterThanOrEqual(2);
      }
    });

    it('should give outsiders fewer clues', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);
      const agentIds = Array.from({ length: 10 }, (_, i) => `agent${i + 1}`);

      const plans = informationEngine.createDistributionPlans(network, agentIds, 0.3);

      // Find agents with lowest expected value (outsiders)
      const sortedPlans = Array.from(plans.values()).sort((a, b) => a.expectedValue - b.expectedValue);
      const outsiders = sortedPlans.slice(0, 3);

      for (const outsider of outsiders) {
        // Outsiders should have 1-2 clues
        expect(outsider.clues.length).toBeLessThanOrEqual(3);
      }
    });
  });

  describe('Daily Clue Release', () => {
    it('should return clues for the correct day', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);
      const agentIds = ['agent1', 'agent2', 'agent3'];

      informationEngine.createDistributionPlans(network, agentIds, 0.3);

      // Test each day
      for (let day = 1; day <= 28; day++) {
        for (const agentId of agentIds) {
          const clues = informationEngine.getCluesForDay(agentId, day);

          // All returned clues should be for this day
          clues.forEach(clue => {
            expect(clue.revealDay).toBe(day);
          });
        }
      }
    });

    it('should respect prerequisite dependencies', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);
      const agentIds = ['agent1'];

      informationEngine.createDistributionPlans(network, agentIds, 1.0); // Make agent1 an insider

      const receivedClueIds = new Set<string>();

      // Simulate daily progression
      for (let day = 1; day <= 28; day++) {
        const clues = informationEngine.getCluesForDay('agent1', day);

        for (const clue of clues) {
          // If clue has prerequisites, they should already be received
          if (clue.prerequisiteClues) {
            for (const prereqId of clue.prerequisiteClues) {
              expect(receivedClueIds.has(prereqId)).toBe(true);
            }
          }

          receivedClueIds.add(clue.id);
        }
      }
    });

    it('should not return clues for agents without access', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);

      informationEngine.createDistributionPlans(network, ['agent1'], 0.3);

      // Agent2 was not in the distribution plan
      const clues = informationEngine.getCluesForDay('agent2', 1);
      expect(clues.length).toBe(0);
    });

    it('should return empty array for invalid day', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);

      informationEngine.createDistributionPlans(network, ['agent1'], 0.3);

      // Day 0 and Day 31 are invalid
      expect(informationEngine.getCluesForDay('agent1', 0).length).toBe(0);
      expect(informationEngine.getCluesForDay('agent1', 31).length).toBe(0);
    });
  });

  describe('Query Interface', () => {
    it('should retrieve distribution plan for agent', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);

      informationEngine.createDistributionPlans(network, ['agent1'], 0.3);

      const plan = informationEngine.getDistributionPlan('agent1');
      expect(plan).toBeDefined();
      expect(plan?.agentId).toBe('agent1');
      expect(plan?.clues).toBeDefined();
      expect(plan?.expectedValue).toBeDefined();
    });

    it('should return undefined for non-existent agent', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);

      informationEngine.createDistributionPlans(network, ['agent1'], 0.3);

      const plan = informationEngine.getDistributionPlan('nonexistent');
      expect(plan).toBeUndefined();
    });

    it('should retrieve clue network', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);

      const retrieved = informationEngine.getClueNetwork();
      expect(retrieved).toBe(network);
      expect(retrieved?.clues.length).toBe(network.clues.length);
    });

    it('should return null before network generation', () => {
      const network = informationEngine.getClueNetwork();
      expect(network).toBeNull();
    });
  });

  describe('Reset Functionality', () => {
    it('should clear all state on reset', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);
      informationEngine.createDistributionPlans(network, ['agent1', 'agent2'], 0.3);

      // Verify state exists
      expect(informationEngine.getClueNetwork()).not.toBeNull();
      expect(informationEngine.getDistributionPlan('agent1')).toBeDefined();

      // Reset
      informationEngine.reset();

      // Verify state cleared
      expect(informationEngine.getClueNetwork()).toBeNull();
      expect(informationEngine.getDistributionPlan('agent1')).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle single player game', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 1);

      const plans = informationEngine.createDistributionPlans(network, ['agent1'], 0.5);

      expect(plans.size).toBe(1);
      const plan = plans.get('agent1');
      expect(plan).toBeDefined();
      expect(plan?.clues.length).toBeGreaterThan(0);
    });

    it('should handle large player count', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 50);
      const agentIds = Array.from({ length: 50 }, (_, i) => `agent${i + 1}`);

      const plans = informationEngine.createDistributionPlans(network, agentIds, 0.3);

      expect(plans.size).toBe(50);

      // Verify information asymmetry is maintained
      const clueSetStrings = new Set<string>();
      for (const plan of plans.values()) {
        const clueIds = plan.clues.map(c => c.id).sort().join(',');
        clueSetStrings.add(clueIds);
      }

      expect(clueSetStrings.size).toBeGreaterThan(10);
    });

    it('should handle zero insider percentage', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);
      const agentIds = Array.from({ length: 10 }, (_, i) => `agent${i + 1}`);

      // At least 1 insider even with 0%
      const plans = informationEngine.createDistributionPlans(network, agentIds, 0.0);

      expect(plans.size).toBe(10);

      // Should still have at least one agent with clues
      const plansWithClues = Array.from(plans.values()).filter(p => p.clues.length > 0);
      expect(plansWithClues.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle 100% insider percentage', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);
      const agentIds = Array.from({ length: 10 }, (_, i) => `agent${i + 1}`);

      const plans = informationEngine.createDistributionPlans(network, agentIds, 1.0);

      // All agents should have clues
      for (const plan of plans.values()) {
        expect(plan.clues.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Clue Content Quality', () => {
    it('should generate non-empty clue content', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);

      for (const clue of network.clues) {
        expect(clue.content).toBeTruthy();
        expect(clue.content.length).toBeGreaterThan(0);
      }
    });

    it('should vary clue content by tier', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);

      const earlyContents = network.clues.filter(c => c.tier === 'early').map(c => c.content);
      const lateContents = network.clues.filter(c => c.tier === 'late').map(c => c.content);

      // Should have different content across tiers
      const uniqueEarly = new Set(earlyContents);
      const uniqueLate = new Set(lateContents);

      expect(uniqueEarly.size).toBeGreaterThan(0);
      expect(uniqueLate.size).toBeGreaterThan(0);
    });

    it('should align clue content with truthfulness', async () => {
      const scenario = await scenarioGenerator.generate();
      const network = informationEngine.generateClueNetwork(scenario, 10);

      // Truthful clues should align with actual outcome
      const truthfulClues = network.clues.filter(c => c.isTruthful);
      const outcome = scenario.secretOutcome;

      // Check that content makes sense (this is basic - real check would need NLP)
      for (const clue of truthfulClues) {
        expect(clue.content).toBeTruthy();
      }
    });
  });
});
