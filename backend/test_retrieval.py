"""
Quick retrieval test — run after ingest to verify hybrid search works.

Usage:
    python test_retrieval.py
"""

import sys
from hr_agent.retrieval.retriever import retrieve


TEST_QUERIES = [
    "How many vacation days do employees get?",
    "What is the policy for bereavement leave?",
    "workplace harassment reporting procedure",
    "AODA accessibility requirements",
]


def main():
    print()
    print("=" * 65)
    print("  HR Agent — Retrieval Test")
    print("=" * 65)

    for query in TEST_QUERIES:
        print(f"\n{'─' * 65}")
        print(f"  Query: {query!r}")
        print(f"{'─' * 65}")

        chunks = retrieve(query, top_k=3)

        if not chunks:
            print("  ⚠  No results returned.")
            continue

        for i, chunk in enumerate(chunks, 1):
            section = f" › {chunk.section_title}" if chunk.section_title else ""
            print(f"\n  [{i}] {chunk.document_name}{section}")
            print(f"      RRF score: {chunk.rrf_score:.4f}")
            # Print first 200 chars of content
            preview = chunk.content.replace("\n", " ")[:200]
            print(f"      {preview}...")

    print()
    print("=" * 65)
    print("  Done. If results look relevant, retrieval is working.")
    print("=" * 65)
    print()


if __name__ == "__main__":
    main()
