import { EmptyState } from "../components/ui";

/** Temporary home pages until F-03 (owner) and F-05 (respondent) are implemented. */
export function OwnerHome() {
  return (
    <section>
      <h1>My surveys</h1>
      <EmptyState title="Survey authoring arrives with F-03." />
    </section>
  );
}

export function RespondentHome() {
  return (
    <section>
      <h1>Available surveys</h1>
      <EmptyState title="Answering surveys arrives with F-05." />
    </section>
  );
}
