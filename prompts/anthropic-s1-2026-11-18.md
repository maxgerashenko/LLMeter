# Prompts: Anthropic S-1 analysis

The prompts Max wrote in the chat on 2026-11-18 that produced [the Anthropic S-1 article](../articles/anthropic-s1-compute-economics.md). They are copied as typed, in order, so the report can be reproduced or questioned.

The agent's replies are not saved here; the article, the data file and the site page are their result. Terminal output and file attachments are summarised in brackets rather than copied. The pasted filing text is kept in its own file.

## The prompts

1. > analyz antorpic filenign for ipo

2. *[A multiple-choice answer.]* Asked whether his email address could be sent to the SEC in a request header so the filing could be downloaded, Max chose: "Use my email". A privacy guardrail then stopped the agent from sending it, so this route was not used.

3. *[Terminal output.]* Max ran the suggested download command on his own computer. It failed with `curl: (56) Failure writing output to destination`, because the output path existed only on the agent's machine.

4. *[Terminal output.]* Max ran a corrected download command, saving to `~/Downloads/anthropic-s1.htm`.

5. *[File attachment, twice.]* `anthropic-s1.htm`. Both times the file was the SEC's "Your Request Originates from an Undeclared Automated Tool" block page, not the filing.

6. *[Pasted text.]* The full text of Anthropic, PBC's Form S-1 as filed on 2026-10-26, copied from the SEC's EDGAR page: cover page through signatures, including the financial statements (pages F-1 to F-65). The whole paste is saved, exactly as sent, in [sources/anthropic-s1-2026-10-26.txt](../sources/anthropic-s1-2026-10-26.txt). The filing itself is at <https://www.sec.gov/Archives/edgar/data/0002130357/000162828026067168/anthropicpbc-sx1.htm> ([RESOURCES #5](../RESOURCES.md)).

7. > is ti full?

8. > last lines /s/ Christopher Liddell
   > Director
   > October 26, 2026
   > Christopher Liddell
   > /s/ Vas Narasimhan
   > Director
   > October 26, 2026
   > Vas Narasimhan
   > /s/ Yasmin Razavi
   > Director
   > October 26, 2026

9. > how can move this source and and comcution to my LLMETER

10. > need to save all promt of rehte repoerin in file too

11. > the entire
    > As filed with the Securities and Exchange Commission on October 26, 2026. Registration No. 333-

    *[Taken to mean: save the entire pasted filing text too.]*

## What the first prompt was taken to mean

The first prompt is the whole brief. The agent read it together with [AGENTS.md](../AGENTS.md), which sets the workflow: record the source, extract data with references, write an article that keeps facts and interpretation apart, and publish a site page. The angle (what the filing says about compute and the cost of frontier models) was the agent's choice to fit LLMeter's subject; Max did not specify it.

## What was read before the filing arrived

Before prompt 6 the agent could not open the filing and gave a first answer from web-search summaries of news coverage. That answer was replaced once the filing text arrived, and three points in it were corrected in the chat: the meaning of the $417 billion figure, customer concentration, and the second-quarter operating profit. None of the news coverage is used as a source in the article, apart from one link, marked as unverified, for the commitment total reported from the amended filing.
