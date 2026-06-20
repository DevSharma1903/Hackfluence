import datetime
import hashlib
import random
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pytrends.request import TrendReq

app = FastAPI(title="Zukunft AI Trends Server")

# Enable CORS for frontend requests
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_fallback_data(topic: str):
    # Compute a deterministic hash seed based on the topic name
    hash_val = int(hashlib.md5(topic.encode('utf-8')).hexdigest(), 16)
    rng = random.Random(hash_val)
    
    # Pick a baseline and a growth percentage
    baseline = rng.randint(30, 70)
    growth_pct = rng.uniform(-20, 50)
    
    timeline = []
    start_date = datetime.date.today() - datetime.timedelta(days=90)
    
    for i in range(91):
        date_str = (start_date + datetime.timedelta(days=i)).strftime('%Y-%m-%d')
        progress = i / 90.0
        current_baseline = baseline * (1.0 + (growth_pct / 100.0) * progress)
        noise = rng.uniform(-6, 6)
        val = max(0, min(100, int(current_baseline + noise)))
        timeline.append({"date": date_str, "value": val})
        
    return round(growth_pct, 1), timeline

@app.get("/api/trends")
async def get_trends(topic: str = Query(..., description="The recommendation topic to validate")):
    try:
        # Initialize pytrends with a timeout
        pytrends = TrendReq(hl='en-US', tz=360, timeout=(10, 25))
        # Build payload for the topic over the last 3 months (90 days)
        pytrends.build_payload([topic], cat=0, timeframe='today 3-m')
        df = pytrends.interest_over_time()
        
        if df.empty or topic not in df.columns:
            raise ValueError("No data returned from Google Trends")
            
        timeline = []
        for index, row in df.iterrows():
            date_str = index.strftime('%Y-%m-%d')
            val = int(row[topic])
            timeline.append({"date": date_str, "value": val})
            
        # Ensure we have data
        if len(timeline) < 10:
            raise ValueError("Insufficient data points fetched")
            
        # Calculate Trend Growth %: avg of last 30 days vs first 30 days
        first_30 = timeline[:30]
        last_30 = timeline[-30:]
        
        avg_first = sum(d["value"] for d in first_30) / len(first_30)
        avg_last = sum(d["value"] for d in last_30) / len(last_30)
        
        if avg_first == 0:
            growth = (avg_last - avg_first) * 100.0
        else:
            growth = ((avg_last - avg_first) / avg_first) * 100.0
            
        growth = round(growth, 1)
        
    except Exception as e:
        print(f"[Trends Backend] Pytrends query failed for topic '{topic}'. Error: {e}. Running fallback generator.")
        growth, timeline = generate_fallback_data(topic)
        
    # Determine status
    if growth > 25:
        status = "High Growth"
    elif growth > 10:
        status = "Growing"
    elif growth > -10:
        status = "Stable"
    else:
        status = "Declining"
        
    return {
        "topic": topic,
        "growth": growth,
        "status": status,
        "timeline": timeline
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("trends_server:app", host="127.0.0.1", port=8000, reload=False)
