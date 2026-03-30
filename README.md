# A.U.R.A. — Adaptive Uncertainty & Risk Agent

## Team

Built at YHack 2026 (Yale University).
Members: 
Mikiyas Asmamaw- Chemical Engineering at Cornell University 
Bolu Omole- Electrical Engineering at Massachusetts Institute of Technology (MIT)

## Inspiration

Growing up in North Dakota, we spent a lot of time around small, local businesses that quietly power everyday life. These stores are the backbone of many communities, but in a world where the markets are constantly changing it can be hard for someone with limited resources to effectively respond.

## What It Does

AURA is an AI-powered decision tool that helps convenience store owners make smarter inventory choices under uncertainty. Users can select a product and simulate decisions such as ordering additional stock, and the system responds with projected outcomes such as stock levels, risk of running out, potential waste, and expected revenue impact. The goal is to take the mess of information in the outside world and make sense of it in a way that owners can trust and act on.

## How We Built It

We built AURA as a full-stack web application. The frontend is a React interface that allows users to quickly interact with products and run simulations. The backend is powered by FastAPI and handles the core logic for forecasting and risk estimation. We integrated external data sources such as weather and location-based signals to better model real-world demand patterns that affect the businesses. On top of this, we used Lava to translate the raw data and model outputs into simple, clear recommendations for the user.

## Challenges We Ran Into

One of the biggest challenges was figuring out how to present the data. It's easy to show raw data, but much harder to interpret it in a way that is useful to the client in their day to day operations. We also had to balance realism with speed. Because the hackathon is only 24 hours, we needed models that were simple enough to implement quickly but still provided accurate outputs. Integrating different versions of the code was also a challenge, as this was one of the first times we had to utilize Github to delegate tasks.

## Accomplishments

We're proud that we built a working product that actually helps users make decisions, not just look at data. The simulation feature runs end-to-end and gives clear results in seconds. We also created a clean, simple interface that makes the tool easy to use, even for someone without a technical background.

## What We Learned

We learned that simple and clear is better than complex. Users don't want more data — they want answers. We also learned how to quickly build and connect a full system under time pressure, and how important teamwork and version control are when building something fast.

## What's Next

Next, we want to connect AURA to more visual inputs so it can give live recommendations on more than just inventory. We also want to improve the accuracy of the predictions. In the long term, we see AURA becoming a tool that small business owners can rely on every day to make smarter decisions.

## Tech Stack

Python, FastAPI, React, Vite, Tailwind CSS, Claude AI (via Lava), Open Food Facts API, html5-qrcode

## Running Locally

**Backend:**
```bash
cd backend
pip install -r requirements.txt
python3 -m uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Create a `.env` file in the project root with your Lava token:
```
LAVA_FORWARD_TOKEN=your_token_here
```


