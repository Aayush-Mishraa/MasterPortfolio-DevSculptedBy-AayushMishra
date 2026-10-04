<?php

declare(strict_types=1);

namespace Site;

/*
 * F31: finds the passages of this site that answer a question. BM25 over
 * api/data/ask-corpus.json, which scripts/ask/build-corpus.mjs writes from
 * the prerendered pages at build time (one entry per ~700-character chunk:
 * { title, url, text }). No embeddings, no external service.
 */
final class Retriever
{
    private const K1 = 1.4;
    private const B = 0.75;

    private const STOP = ['a', 'an', 'and', 'are', 'as', 'at', 'be', 'but', 'by', 'can', 'do', 'does', 'for', 'from', 'has', 'have', 'he', 'his',
        'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its', 'me', 'my', 'of', 'on', 'or', 'our', 'so', 'that', 'the', 'their', 'them', 'then',
        'there', 'these', 'they', 'this', 'to', 'was', 'we', 'what', 'when', 'where', 'which', 'who', 'why', 'will', 'with', 'you', 'your',
        'about', 'tell', 'aayush', 'mishra', 'would', 'could', 'should', 'any', 'all', 'just', 'also', 'more', 'very', 'than', 'been', 'being'];

    /** @var list<array{title: string, url: string, text: string, tokens: array<string, int>, length: int}> */
    private array $docs = [];
    /** @var array<string, int> */
    private array $df = [];
    private float $avgLength = 1.0;

    public function __construct(string $file)
    {
        if (!is_file($file)) {
            return;
        }
        $data = json_decode((string) file_get_contents($file), true);
        foreach (is_array($data['chunks'] ?? null) ? $data['chunks'] : [] as $chunk) {
            if (!is_array($chunk) || !is_string($chunk['text'] ?? null)) {
                continue;
            }
            $tokens = array_count_values(self::tokens($chunk['title'] . ' ' . $chunk['text']));
            $this->docs[] = [
                'title' => (string) ($chunk['title'] ?? ''),
                'url' => (string) ($chunk['url'] ?? ''),
                'text' => $chunk['text'],
                'tokens' => $tokens,
                'length' => array_sum($tokens),
            ];
            foreach (array_keys($tokens) as $token) {
                $this->df[$token] = ($this->df[$token] ?? 0) + 1;
            }
        }
        if ($this->docs) {
            $this->avgLength = max(1.0, array_sum(array_column($this->docs, 'length')) / count($this->docs));
        }
    }

    public function ready(): bool
    {
        return $this->docs !== [];
    }

    /** @return list<string> */
    public static function tokens(string $text): array
    {
        preg_match_all('/[a-z0-9][a-z0-9+#.]*/u', mb_strtolower($text), $matches);
        $out = [];
        foreach ($matches[0] as $word) {
            $word = rtrim($word, '.');
            if (strlen($word) < 2 || in_array($word, self::STOP, true)) {
                continue;
            }
            // A light stem, so "tests" finds "testing" and "test".
            $out[] = (string) preg_replace('/(ing|ed|es|s)$/', '', $word) ?: $word;
        }
        return $out;
    }

    /**
     * The best $limit passages, best first. Each has a BM25 score and, for
     * the page, a 0–1 "match" (share of the question's terms it contains).
     *
     * @return list<array{title: string, url: string, text: string, score: float, match: float}>
     */
    public function search(string $question, int $limit = 5): array
    {
        $terms = array_values(array_unique(self::tokens($question)));
        if (!$terms || !$this->docs) {
            return [];
        }
        $count = count($this->docs);
        $results = [];
        foreach ($this->docs as $doc) {
            $score = 0.0;
            $hit = 0;
            foreach ($terms as $term) {
                $frequency = $doc['tokens'][$term] ?? 0;
                if ($frequency === 0) {
                    continue;
                }
                $hit++;
                $df = $this->df[$term] ?? 0;
                $idf = log(1 + ($count - $df + 0.5) / ($df + 0.5));
                $score += $idf * ($frequency * (self::K1 + 1)) / ($frequency + self::K1 * (1 - self::B + self::B * $doc['length'] / $this->avgLength));
            }
            if ($score > 0) {
                $results[] = ['title' => $doc['title'], 'url' => $doc['url'], 'text' => $doc['text'], 'score' => round($score, 3), 'match' => round($hit / count($terms), 3)];
            }
        }
        usort($results, static fn ($a, $b) => $b['score'] <=> $a['score']);
        // One passage per page among the first few keeps the sources varied.
        $seen = [];
        $picked = [];
        foreach ($results as $result) {
            if (isset($seen[$result['url']]) && $seen[$result['url']] >= 2) {
                continue;
            }
            $seen[$result['url']] = ($seen[$result['url']] ?? 0) + 1;
            $picked[] = $result;
            if (count($picked) >= $limit) {
                break;
            }
        }
        return $picked;
    }

    /**
     * Groundedness of an answer: the share of its sentences whose content
     * words mostly (≥ 60%) appear in the passages, numbers exactly.
     *
     * @param list<array{text: string}> $passages
     * @return array{grounded: float, cited: float, sentences: int}
     */
    public static function evaluate(string $answer, array $passages): array
    {
        $evidence = [];
        $numbers = [];
        foreach ($passages as $passage) {
            foreach (self::tokens($passage['text']) as $token) {
                $evidence[$token] = true;
            }
            preg_match_all('/\d+(?:[.,]\d+)?/', $passage['text'], $found);
            foreach ($found[0] as $number) {
                $numbers[str_replace(',', '', $number)] = true;
            }
        }
        $sentences = preg_split('/(?<=[.!?])\s+/', trim($answer)) ?: [];
        $sentences = array_values(array_filter($sentences, static fn ($sentence) => mb_strlen(trim($sentence)) > 15));
        if (!$sentences) {
            return ['grounded' => 0.0, 'cited' => 0.0, 'sentences' => 0];
        }
        $grounded = 0;
        $cited = 0;
        foreach ($sentences as $sentence) {
            if (preg_match('/\[\d+\]/', $sentence)) {
                $cited++;
            }
            $plain = (string) preg_replace('/\[\d+\]/', '', $sentence);
            $tokens = self::tokens($plain);
            $covered = $tokens ? count(array_filter($tokens, static fn ($token) => isset($evidence[$token]))) / count($tokens) : 1;
            preg_match_all('/\d+(?:[.,]\d+)?/', $plain, $found);
            $badNumber = false;
            foreach ($found[0] as $number) {
                if (!isset($numbers[str_replace(',', '', $number)])) {
                    $badNumber = true;
                }
            }
            if ($covered >= 0.6 && !$badNumber) {
                $grounded++;
            }
        }
        $total = count($sentences);
        return ['grounded' => round($grounded / $total, 3), 'cited' => round($cited / $total, 3), 'sentences' => $total];
    }
}
