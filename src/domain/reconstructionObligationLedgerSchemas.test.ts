import { describe, expect, it } from "vitest";

import {
  reconstructionObligationLedgerSchema,
  reconstructionObligationManifestSchema,
  type ReconstructionObligationLedger,
} from "./reconstructionObligationLedgerSchemas.js";
import {
  reconstructionObligationLedgerClosureDigest,
  summarizeReconstructionObligations,
} from "./reconstructionObligationLedgerIntegrity.js";
import { reconstructionObligationProofSchema } from "./reconstructionObligationProof.js";

const digest = "a".repeat(64);

describe("reconstruction obligation ledger schemas", () => {
  it("accepts explicit fixture controls and content-bound fixture proof", () => {
    const verifier = {
      verifier_id: "verifier-1",
      claim_id: "claim-1",
      command: "verify",
      authority: "integration",
      status: "pass",
      result_evidence_id: `ev_${digest}`,
      enumerated_obligation_ids: ["obligation-1"],
      nondeterminism: { mode: "total-order", specification: "fixed order" },
      controls: [
        {
          control_id: "control-1",
          candidate_kind: "fixture",
          candidate_id: "fixture-bad",
          candidate_sha256: digest,
          defect: "wrong output",
          status: "fail",
          result_evidence_id: `ev_${digest}`,
        },
      ],
    };
    expect(
      reconstructionObligationManifestSchema.safeParse({
        bindings: [
          {
            obligation_id: "obligation-1",
            owner: {
              module_path: "src/example.ts",
              symbol: "example",
              owner_sha256: digest,
            },
            parser_type: null,
            original_cases: [],
            fixtures: [],
            verifier,
          },
        ],
        contradictions: [],
      }).success,
    ).toBe(true);
    expect(
      reconstructionObligationProofSchema.safeParse({
        bindings: [
          {
            obligation_id: "obligation-1",
            obligation_version: 1,
            owner_sha256: digest,
            fixtures: [
              {
                fixture_id: "fixture-good",
                case_kind: "positive",
                passed: true,
                fixture_sha256: digest,
              },
            ],
            verifiers: [],
          },
        ],
      }).success,
    ).toBe(true);
  });

  it("accepts manifests and ledgers with more than 10,000 entries", () => {
    const binding = {
      obligation_id: "obligation-1",
      owner: {
        module_path: "src/example.ts",
        symbol: "example",
        owner_sha256: digest,
      },
      parser_type: null,
      original_cases: [],
      fixtures: [],
      verifier: null,
    };
    const manifest = {
      bindings: Array.from({ length: 10_001 }, (_, index) => ({
        ...binding,
        obligation_id: `obligation-${index}`,
      })),
      contradictions: [],
    };
    expect(
      reconstructionObligationManifestSchema.parse(manifest).bindings,
    ).toHaveLength(10_001);

    const ledgerBase: Omit<ReconstructionObligationLedger, "closure_digest"> = {
      schema: "ReconstructionObligationLedger",
      ledger_id: `rol_${digest}`,
      status: "unknown",
      coverage: { status: "complete" },
      summary: {
        ...summarizeReconstructionObligations([]),
      },
      reports: {
        missing_owner_obligation_ids: [],
        missing_verifier_obligation_ids: [],
        contradicted_obligation_ids: [],
        residual_unknown_ids: [],
      },
      ownership_graph: [],
      dependency_graph: [],
      obligations: [],
      evidence_links: Array.from(
        { length: 100_001 },
        (_, index) => `ev_${index.toString(16).padStart(64, "0")}`,
      ),
      limitations: [],
    };
    const ledger = {
      ...ledgerBase,
      closure_digest: reconstructionObligationLedgerClosureDigest(ledgerBase),
    };

    expect(
      reconstructionObligationLedgerSchema.parse(ledger).evidence_links,
    ).toHaveLength(100_001);
  });
});
