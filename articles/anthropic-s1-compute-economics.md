# What Anthropic's S-1 says about the cost of the frontier

*Written 2026-11-18. Source read on 2026-11-18. Data file: [data/anthropic-s1-2026-10-26.csv](../data/anthropic-s1-2026-10-26.csv). Prompts: [prompts/anthropic-s1-2026-11-18.md](../prompts/anthropic-s1-2026-11-18.md).*

## Summary

Anthropic filed its IPO registration statement (Form S-1) on 2026-10-26 ([RESOURCES #5](https://www.sec.gov/Archives/edgar/data/0002130357/000162828026067168/anthropicpbc-sx1.htm)). It is the first time a frontier lab has published audited accounts, so it is the best public record so far of what frontier models cost to build and what they earn. Page numbers below are the prospectus's own.

Four findings matter for LLMeter:

- **Each dollar of compute now earns about five times more revenue than a year earlier.** Revenue per dollar of compute and infrastructure expense rose from $0.40 in Q1 2025 to $2.08 in Q2 2026 (derived from the quarterly table, p. 157).
- **Most compute does not serve customers.** In the first half of 2026, at least 73% of the $8.9 billion compute bill went to research, model development, internal use and free access rather than to paying customers' requests (derived from Note 8, p. F-39).
- **The business turned an operating profit in Q2 2026** ($974 million), while the reported net loss of $80.7 billion for the half year is almost entirely accounting for the rising value of convertible notes.
- **The commitments are far larger than the business.** The parts the filing discloses add up to about $853 billion of committed spend, almost all compute, against revenue running at about $68 billion a year (both derived; see below).

The filing has two limits. This first version leaves several numbers blank, including third-quarter revenue and the total commitment figure. An amended filing (S-1/A) reportedly fills them in; LLMeter has not read it.

## What was read, and how

The text of the S-1 was copied from the SEC's EDGAR page by Max and read in full, from the cover page to the signatures, including the financial statements (pages F-1 to F-65). The charts and customer case studies in the filing are images and were not read.

Figures for 2023, 2024 and 2025 are audited. Figures for the six months to June 30, 2025 and 2026, and all quarterly figures, are unaudited. Anything the company says about the third quarter of 2026 is a management statement, not part of the financial statements.

In the tables, **reported** means the number is printed in the filing. **Derived** means LLMeter calculated it from reported numbers, and the calculation is given.

## Revenue and the compute bill

Reported, in millions of US dollars (statements of operations, p. F-7):

| | 2023 | 2024 | 2025 | H1 2025 | H1 2026 |
| --- | --- | --- | --- | --- | --- |
| Revenue | 41 | 386 | 4,585 | 1,163 | 16,286 |
| Compute and infrastructure | 433 | 2,522 | 7,326 | 2,334 | 8,945 |
| Personnel | 95 | 454 | 1,839 | 538 | 3,152 |
| Bartz copyright settlement | 0 | 0 | 1,500 | 0 | 0 |
| Sales, marketing and partnerships | 2 | 43 | 568 | 120 | 3,168 |
| Other operating and administrative | 62 | 347 | 1,412 | 306 | 1,714 |
| **Operating loss** | (551) | (2,980) | (8,060) | (2,135) | (693) |
| Change in fair value of convertible notes, derivatives and SAFEs | (1,045) | (5,434) | (34,308) | (10,942) | (72,388) |
| **Net loss** | (1,531) | (8,309) | (41,965) | (12,969) | (80,748) |

Revenue grew 841% in 2024, 1,088% in 2025 and 1,300% in the first half of 2026 against the first half of 2025 (reported, p. 62).

By quarter, in millions of US dollars (reported, p. 157; the last two rows are derived):

| | Q1 2025 | Q2 2025 | Q3 2025 | Q4 2025 | Q1 2026 | Q2 2026 |
| --- | --- | --- | --- | --- | --- | --- |
| Revenue | 376 | 787 | 1,382 | 2,040 | 4,731 | 11,555 |
| Compute and infrastructure | 944 | 1,390 | 2,047 | 2,945 | 3,387 | 5,558 |
| Operating income (loss) | (935) | (1,200) | (3,089) | (2,836) | (1,667) | 974 |
| Compute as a share of revenue | 251% | 177% | 148% | 144% | 72% | 48% |
| Revenue per dollar of compute | $0.40 | $0.57 | $0.68 | $0.69 | $1.40 | $2.08 |

Over those six quarters revenue grew about 31 times and the compute bill about 6 times.

**Why the ratio moves in steps.** The filing says most compute is contracted 12 to 18 months before it is available, and the expense is recognised when the capacity comes online, "often in large, discrete steps" (pp. 133 to 134). Revenue then catches up. So the fall from 144% to 48% is partly real efficiency and partly timing: demand grew into capacity that had already been bought. The company itself warns that margins "may compress" when the next large blocks of compute arrive (p. 133).

## Most compute is not spent serving customers

The filing reports no gross margin. But Note 8 (p. F-39) regroups the same expenses by function, and says that cost of revenue is mostly the compute used for customer-serving workloads:

| Millions of US dollars | 2023 | 2024 | 2025 | H1 2025 | H1 2026 |
| --- | --- | --- | --- | --- | --- |
| Cost of revenue (reported) | 26 | 752 | 2,773 | 1,019 | 2,380 |
| Research and development (reported) | 422 | 2,275 | 6,338 | 1,850 | 9,741 |
| Gross margin (derived) | 37% | -95% | 40% | 12% | 85% |
| Compute outside cost of revenue, at least (derived) | 407 | 1,770 | 4,553 | 1,315 | 6,565 |
| ...as a share of all compute (derived) | 94% | 70% | 62% | 56% | 73% |

The last two rows subtract all of cost of revenue from the compute bill. Because cost of revenue also holds some staff and overhead costs, the true non-customer share is a little higher than shown.

Two readings follow, and they point in different directions:

- **Serving a model is cheap relative to its price.** In the first half of 2026 it cost at most $2.4 billion to serve $16.3 billion of revenue.
- **Staying at the frontier is the expensive part.** At least $6.6 billion of compute in six months went to research, training the next models, Anthropic's own use of Claude, and free users. The filing says these uses cannot be separated from revenue: it treats model development as "a direct input" to revenue because customers move to the newest model quickly (p. 145). Model versions released in the previous six months produced over 80% of third-quarter revenue (p. 143).

That second point is the important one for anyone reading the 85% margin as proof of a cheap business. A model earns for about half a year before its successor replaces it, so the training bill recurs.

## The net loss is mostly accounting

Of the $80.7 billion net loss for the first half of 2026, $72.4 billion is the change in fair value of convertible notes, and a further $8.7 billion is the change in value of other financing agreements (p. 156). These are non-cash: the notes are owed in shares, and their value rises when the company's valuation rises. Only $6.2 billion of note principal is outstanding, all held by Amazon, yet it sits on the balance sheet at $108.6 billion (pp. 164 and F-5).

The operating line is the one that describes the business: a loss of $693 million for the half year, and a profit of $974 million in the second quarter. Net cash from operating activities was positive at $3.9 billion for the half year (p. F-12), helped by a $2.1 billion fall in prepaid expenses.

## The third quarter, reconstructed

The filing leaves third-quarter revenue blank, but states two facts that fix it:

- Revenue for the three months to September 30, 2026 was 86 times revenue for the three months to December 31, 2024 (p. 183).
- Revenue for the three months to December 31, 2024 was $197 million (p. 63).

So third-quarter 2026 revenue was about **$16.9 billion** (86 x 197; derived). Two other statements in the filing agree with it: revenue per employee of "over $6.6 million" on about 5,300 employees, and trailing-twelve-month revenue growth of about 1,200% (p. 136).

That is growth of about 47% on the second quarter, after 132% and 144% in the two quarters before. The filing offers three reasons growth could slow in that quarter, without attributing the slowdown to any of them: lower usage over summer holidays (p. 143), tighter enforcement in August and September against customers breaking the usage policy, who made up an estimated 5% to 7% of revenue for the nine months (p. 145), and capacity limits, since the company says it has "consistently operated in a compute-constrained environment" (p. 135).

## Commitments

The filing leaves its own total blank. The parts it does disclose:

| Item | Amount | Where |
| --- | --- | --- |
| Non-cancelable purchase commitments at 2026-06-30 | $265.6 billion | Note 13, p. F-58 |
| Leases signed but not yet started at 2026-06-30 | $321.4 billion | Note 7, p. F-35 |
| New commitments, July 1 to October 26, 2026 | about $245 billion | Note 17, p. F-65 |
| New short-term commitments, same period | about $21 billion | Note 17, p. F-65 |
| **Sum (derived)** | **about $853 billion** | |

Not in that sum: additional Google TPU compute for 2028 to 2031, estimated at $125 billion to $150 billion, and an AMD agreement expected to exceed $20 billion, neither of which has a fixed amount (pp. 170 to 171).

For scale, the same two lines were $54.6 billion and $50.2 billion at the end of 2025. The commitments grew about eightfold in ten months.

The named agreements (reported, pp. 170 to 171):

| Counterparty | Amount | Period | Hardware |
| --- | --- | --- | --- |
| Broadcom (equipment leases) | $161.2 billion, before interest | five-year leases | Google TPUs |
| SpaceXAI | up to $120.5 billion | into 2029 | NVIDIA GPUs |
| Google | at least $114.5 billion | April 2026 to July 2033 | TPUs and cloud |
| Amazon | at least $110.0 billion | May 2026 to April 2036 | Trainium and cloud |
| Microsoft | at least $44.9 billion | November 2026 to May 2033 | NVIDIA GPUs |
| Nscale | up to $44.6 billion | into 2033 | NVIDIA GPUs |
| Lambda | about $41.3 billion | into 2034 | NVIDIA GPUs |

The SpaceXAI agreement alone runs at about $3.1 billion a month once all capacity is delivered, expected in December 2026. That is about $9.3 billion a quarter from one supplier, against a total compute bill of $5.6 billion in the second quarter of 2026. It can be cancelled on 90 days' notice after early 2027; most of the others cannot.

Against these, the company held $131.7 billion of cash and short-term investments at June 30, 2026, and has up to $77 billion of further note financing from Google, Amazon and Broadcom, a $15 billion credit line and a $5 billion equity commitment from AMD (pp. 162 to 165).

## What the filing says about the models

These are the company's own statements. None was independently measured, and the benchmarks named are not ones LLMeter tracks.

| Fact | Value | Where |
| --- | --- | --- |
| Model classes | Mythos (sold with safeguards as Fable), Opus, Sonnet, Haiku | p. 199 |
| Customer cost per task, Opus 5.5 against Opus 5 | about 40% lower | p. 195 |
| Customer cost per task, Fable 5.1 against Fable 5 | about 25% lower, up to 45% for complex agentic work | p. 195 |
| ExploitBench score: Opus 4.8, Mythos 5, Opus 5.5 | 40%, 78%, 91% within about four months | p. 189 |
| Internal benchmark, open-ended engineering problems | about 90% in September 2026, up about 50 points in nine months | p. 183 |
| Share of Anthropic's own code written by Claude | over 90% in September 2026 | p. 183 |
| Code contributed per engineer per day, Q3 2026 against 2024 | over 45 times | p. 183 |
| Chip families used for training and serving | AWS Trainium, Google TPU, NVIDIA GPU, AMD GPU | p. 135 |
| Time between contracting compute and using it | typically 12 to 18 months | p. 134 |
| Staff | about 940 at end of 2024, about 5,300 at 2026-09-30 | p. 63 |

Release months given in the filing: Claude Code preview February 2025, Opus 4.5 November 2025, Cowork preview January 2026, Mythos Preview April 2026, Fable 5 and Mythos 5 June 2026, and Fable 5.1, Mythos 5.1 and Opus 5.5 September 2026.

The ExploitBench and internal-benchmark numbers should not be compared with LLMeter's other data. The filing does not give the benchmark version or setup, and it warns that its internal success rates "may not be replicable" (p. 68). It also discloses that its models have behaved differently when they detect they are being evaluated (p. 46).

## Customers and concentration

- More than 11,900 customers paid $100,000 or more over twelve months at September 30, 2026, up from about 200 at the end of 2024. More than 1,900 paid $1 million or more and about 250 paid $10 million or more (p. 142).
- The top five customers were about 25% of revenue for the nine months to September 30, 2026 (p. 56).
- 48% of first-half 2026 revenue was billed through the cloud marketplaces of Amazon, Google and Microsoft (p. F-16). Fees to these channel partners rose by $2.7 billion in the same half year (p. 149).
- Pay-per-use made up 80% of first-half revenue and subscriptions 20% (p. 138). Most customers can reduce spending at any time.

## What it means for LLMeter

These are interpretations, with a confidence level for each.

**Compute efficiency is now a measurable factor in model progress. Confidence: high for the direction, medium for the size.** The filing gives the first audited series linking a frontier lab's compute spending to its output. The fivefold rise in revenue per compute dollar is real, but part of it is timing, and the company expects it to reverse for a while as new capacity lands. The next few quarters will show how much was efficiency.

**The cost of the frontier is the training cycle, not serving. Confidence: medium.** The split in Note 8 is the company's own allocation and is a lower bound, and "compute outside cost of revenue" also covers internal use and free users, so it is not a pure training figure. Still, the shape is clear: serving is the small part.

**Progress is being bought forward on a very large scale. Confidence: medium.** About $853 billion of commitments, most of them payable whether or not the capacity is used, is roughly twelve and a half years of revenue at the third-quarter rate. The sum is LLMeter's own addition of the disclosed parts. The filing's blank total could differ, and press reports of the amended filing put it near $895 billion ([DCD](https://www.datacenterdynamics.com/en/news/anthropic-s-1-update-reveals-8954bn-in-cloud-and-data-center-commitments/), not verified by LLMeter).

**Hardware is diversifying away from a single vendor. Confidence: high.** The largest single commitments are for Google TPUs through Broadcom and Google, with Trainium, NVIDIA and AMD alongside. For LLMeter's hardware tracking, that means price and performance across four chip families now matter for one frontier lab.

**The valuation implied by the last private round was about $1 trillion. Confidence: low to medium.** The filing says 846,840,960 shares equal 5% of fully diluted shares (p. 12), which gives about 16.9 billion shares. The Series H round in May and June 2026 was priced at $589.0095 per preferred share, each converting to ten common shares (p. F-46). Multiplying the two gives about $998 billion. This treats every share class and unexercised option as worth the Series H price, so it is a rough upper reading, and the IPO price was not set in this filing.

## Missing data

- **Third-quarter 2026 revenue**, run-rate revenue, the total commitment figure, the commitment schedule by year, and all offering terms are blank in this filing.
- **The amended filing (S-1/A)** has not been read. It should replace the derived third-quarter and commitment figures here with reported ones.
- **Training against inference compute** is not disclosed directly. The Note 8 split is the closest available.
- **No physical quantities**: the filing gives dollars, not gigawatts, chip counts or tokens served.
- **No model sizes, training data volumes or training run costs.** The filing says only that large training runs last "weeks or months" and that it once delayed pre-training a new base model by more than a month for security work (pp. 28 and 51).
