export const membershipTopics = [
    { value: "ASTHMA", label: "Asthma" },
    { value: "TB", label: "Tuberculosis (TB)" },
    { value: "DIABETES", label: "Diabetes" },
    { value: "HYPERTENSION", label: "High blood pressure" },
] as const;

export const membershipTopicValues = ["ASTHMA", "TB", "DIABETES", "HYPERTENSION"] as const;
export type MembershipTopic = (typeof membershipTopicValues)[number];

export const membershipTopicLabels: Record<MembershipTopic, string> = {
    ASTHMA: "Asthma",
    TB: "Tuberculosis (TB)",
    DIABETES: "Diabetes",
    HYPERTENSION: "High blood pressure",
};
