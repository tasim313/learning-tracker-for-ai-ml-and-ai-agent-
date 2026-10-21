import assert from "node:assert/strict";
import test from "node:test";
import { applicationDataSchema, schemaVersion } from "../src/lib/model";
import { createSeedData } from "../src/lib/seed";

test("seed data has twelve ordered roadmap phases and no invented activity", () => {
  const data = createSeedData();
  const result = applicationDataSchema.safeParse(data);

  assert.equal(result.success, true);
  assert.equal(data.schemaVersion, schemaVersion);
  assert.equal(data.roadmapPhases.length, 12);
  assert.equal(data.topics.length, 48);
  assert.equal(data.subtopics.length, 96);
  assert.equal(data.learningTasks.length, 144);
  assert.equal(data.subtopics.every((subtopic) => data.topics.some((topic) => topic.id === subtopic.topicId)), true);
  assert.equal(data.learningTasks.every((task) => data.subtopics.some((subtopic) => subtopic.id === task.subtopicId)), true);
  assert.equal(data.resources.length, 77);
  assert.equal(data.resources.filter(({ type }) => type === "video").length >= 3, true);
  assert.equal(data.resources.filter(({ type }) => type === "slide").length, 2);
  assert.deepEqual(data.roadmapPhases.map(({ order }) => order), Array.from({ length: 12 }, (_, index) => index + 1));
  assert.deepEqual(data.learningSessions, []);
  assert.deepEqual(data.examinationAttempts, []);
  assert.deepEqual(data.experiments, []);
  assert.deepEqual(data.opportunities, []);
});

test("schema rejects topics referencing missing phases", () => {
  const data = createSeedData();
  data.topics[0].phaseId = "missing-phase";

  assert.equal(applicationDataSchema.safeParse(data).success, false);
});
