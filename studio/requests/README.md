# Assistant-controlled one-shot production requests

The user does NOT need to visit GitHub Actions or dispatch workflows.

To start exactly one budget-limited work order, the assistant commits studio/requests/next.json to main containing this JSON:

{"requestId":"ICE-20261111-FLAME-003","order":"studio/work-orders/ice-flame-polish-01.json","note":"One supervised run, no schedule"}

A change to this single file triggers the production workflow. The selector checks the existing work order, role and paths. The pipeline reserves a budget in the ledger, generates a candidate, independently reviews and tests it, and produces a draft PR if accepted.

Commits elsewhere in the repository or on another branch do not initiate paid work. Each new request has a unique requestId. The ledger and concurrency group limit cost; failed jobs are not automatically retried.

The assistant handles workflow initiation, failure analysis, code review, and accepting PRs. The user only needs to connect credentials when required by the provider and test playable builds.
