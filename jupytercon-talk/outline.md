## Talk Outline

* Who am I
  - Jupyter developer
  - Founder of nteract
  - "My curiosities"
* My love of iteration, creating an iterative feedback loop
  - Optionally, give a little demo here. Note that the audience is probably familiar
* Netflix Parking lot
* "What if we could run an agent on a machine that connects the runtime back to a document engine?"
* It's not that I want to solve "realtime collaboration" so much as ensure consistency. We're bringing AI in the Loop.
* A way forward: event sourcing
  - Note how we did similar in nteract with Redux, at Noteable with a JSON format, in CoCalc
* Explain event sourcing
* Explain how LiveStore relies on SQLite and makes frontend querying data really easy
* Back to runtime agents
 - How do we coordinate work with our queue
* Problems with this runtime agents model
* Isolating execution in a pyodide sandbox

## Parking Lot

These are all the bits I don't know how to fit in above.

### A Little Too Far

Tempting to point out some non-event sourcing "I just have to solve it for this prototype" bits too:

* IFramed outputs (separate domain)
* Separate artifacts for outputs (to trim event log and store images as bytes)

Note that we **had** to do the iframing because of having live collaboration

### Demo runtime

Show off how the system works, on a notebook level, and also in an agentic interaction level
