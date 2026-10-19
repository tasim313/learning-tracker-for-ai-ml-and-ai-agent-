import assert from "node:assert/strict";
import test from "node:test";
import catalog from "../src/data/course-materials.json";

test("course materials preserve all imported course tabs without invalid or duplicate rows", () => {
  assert.deepEqual(catalog.courses.map(({ sourceSheet, items }) => [sourceSheet, items.length]), [
    ["CSE425_T", 83],
    ["CSE221_T", 47],
    ["CSE422_L", 20],
    ["Archive", 11],
    ["Misc", 18]
  ]);

  for (const course of catalog.courses) {
    const rows = course.items.map(({ row }) => row);
    assert.equal(new Set(rows).size, rows.length, `${course.sourceSheet} has duplicate source rows`);
    for (const item of course.items) {
      assert.ok(item.title, `${course.sourceSheet} row ${item.row} has no title`);
      assert.ok(!item.url || item.url.startsWith("https://"), `${course.sourceSheet} row ${item.row} has a non-HTTPS link`);
    }
  }
});

test("video, slides, and course reference links are included in the imported catalog", () => {
  const allItems = catalog.courses.flatMap(({ items }) => items);
  assert.ok(allItems.some(({ url }) => url.includes("youtube.com") || url.includes("youtu.be")));
  assert.ok(allItems.some(({ url }) => url.includes("presentation/d/")));
  assert.ok(allItems.some(({ title }) => title.includes("Class Recording")));
  assert.ok(allItems.some(({ title }) => title.includes("Syllabus") || title.includes("Lecture Plan")));
});
