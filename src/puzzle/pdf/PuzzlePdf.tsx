import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { GenerateResult } from "@/engine";
import { answerCells } from "../GridPreview";

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica" },
  title: { fontSize: 20, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  subtitle: { fontSize: 10, color: "#666", marginBottom: 16 },
  grid: { borderWidth: 1, borderColor: "#111", alignSelf: "center" },
  row: { flexDirection: "row" },
  bank: { marginTop: 24, flexDirection: "row", flexWrap: "wrap", gap: 6 },
  bankWord: { fontSize: 11, fontFamily: "Courier-Bold", marginRight: 14, marginBottom: 4 },
});

function Grid({ result, answersOnly }: { result: GenerateResult; answersOnly: boolean }) {
  const size = result.settings.size;
  const cellPt = Math.min(Math.floor(500 / size), 26);
  const answers = answersOnly ? answerCells(result) : null;
  return (
    <View style={styles.grid}>
      {result.grid.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((letter, c) => {
            const hit = answers?.has(`${r},${c}`) ?? true;
            return (
              <View
                key={c}
                style={{
                  width: cellPt,
                  height: cellPt,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: answersOnly && hit ? "#d9d9d9" : undefined,
                }}
              >
                <Text
                  style={{
                    fontSize: cellPt * 0.55,
                    fontFamily: hit && answersOnly ? "Courier-Bold" : "Courier",
                    color: answersOnly && !hit ? "#bbb" : "#111",
                  }}
                >
                  {letter}
                </Text>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

export function PuzzlePdf({ result, title }: { result: GenerateResult; title: string }) {
  return (
    <Document title={title}>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>
          Find all {result.placements.length} words. Puzzle #{result.settings.seed}
        </Text>
        <Grid result={result} answersOnly={false} />
        <View style={styles.bank}>
          {result.placements
            .map((p) => p.word)
            .sort()
            .map((word) => (
              <Text key={word} style={styles.bankWord}>
                {word}
              </Text>
            ))}
        </View>
      </Page>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.title}>Answer key</Text>
        <Text style={styles.subtitle}>{title} — Puzzle #{result.settings.seed}</Text>
        <Grid result={result} answersOnly />
      </Page>
    </Document>
  );
}
