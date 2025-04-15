import { useState } from "react";
import { Container } from "@/components/ui/container";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AiToolsPage() {
  const { toast } = useToast();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [isAskLoading, setIsAskLoading] = useState(false);
  
  const [insightType, setInsightType] = useState("bookings");
  const [insights, setInsights] = useState("");
  const [isInsightLoading, setIsInsightLoading] = useState(false);
  
  const [sopTopic, setSopTopic] = useState("");
  const [sopDetails, setSopDetails] = useState("");
  const [sopResult, setSopResult] = useState("");
  const [isSopLoading, setIsSopLoading] = useState(false);
  
  const [sentimentText, setSentimentText] = useState("");
  const [sentimentResult, setSentimentResult] = useState<{
    sentiment: string;
    score: number;
    keyPoints: string[];
  } | null>(null);
  const [isSentimentLoading, setIsSentimentLoading] = useState(false);
  
  // Forecasting states
  const [forecastType, setForecastType] = useState("revenue");
  const [timeframe, setTimeframe] = useState("month");
  const [forecastResult, setForecastResult] = useState<{
    forecast: Array<{date: string; value: number; prediction: boolean}>;
    insights: Array<{title: string; description: string}>;
    summary: string;
  } | null>(null);
  const [isForecastLoading, setIsForecastLoading] = useState(false);

  const askQuestion = async () => {
    if (!question.trim()) {
      toast({
        title: "Question required",
        description: "Please enter a question to ask the AI assistant.",
        variant: "destructive",
      });
      return;
    }
    
    setIsAskLoading(true);
    try {
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ question }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to get AI response");
      }
      
      const data = await response.json();
      setAnswer(data.answer);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to get AI response",
        variant: "destructive",
      });
    } finally {
      setIsAskLoading(false);
    }
  };

  const generateInsights = async () => {
    setIsInsightLoading(true);
    try {
      const response = await fetch("/api/ai/insights", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ dataType: insightType }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to generate insights");
      }
      
      const data = await response.json();
      setInsights(data.insights);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate insights",
        variant: "destructive",
      });
    } finally {
      setIsInsightLoading(false);
    }
  };

  const generateSOP = async () => {
    if (!sopTopic.trim() || !sopDetails.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both a topic and details for the SOP.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSopLoading(true);
    try {
      const response = await fetch("/api/ai/sop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ topic: sopTopic, details: sopDetails }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to generate SOP");
      }
      
      const data = await response.json();
      setSopResult(data.sop);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate SOP",
        variant: "destructive",
      });
    } finally {
      setIsSopLoading(false);
    }
  };

  const analyzeSentiment = async () => {
    if (!sentimentText.trim()) {
      toast({
        title: "Text required",
        description: "Please enter text to analyze sentiment.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSentimentLoading(true);
    try {
      const response = await fetch("/api/ai/sentiment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: sentimentText }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to analyze sentiment");
      }
      
      const data = await response.json();
      setSentimentResult(data.result);
    } catch (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to analyze sentiment",
        variant: "destructive",
      });
    } finally {
      setIsSentimentLoading(false);
    }
  };

  // Generate forecast function
  const generateForecast = async () => {
    setIsForecastLoading(true);
    try {
      const response = await fetch("/api/ai/forecast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          forecastType, 
          timeframe
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || "Failed to generate forecast");
      }
      
      const data = await response.json();
      setForecastResult(data.result);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to generate forecast",
        variant: "destructive",
      });
    } finally {
      setIsForecastLoading(false);
    }
  };

  return (
    <div className="p-4">
      <Container>
        <h1 className="text-3xl font-bold mb-6">AI Tools</h1>
        
        <Tabs defaultValue="ask">
          <TabsList className="mb-4">
            <TabsTrigger value="ask">AI Assistant</TabsTrigger>
            <TabsTrigger value="insights">Generate Insights</TabsTrigger>
            <TabsTrigger value="sop">Create SOP</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment Analysis</TabsTrigger>
            <TabsTrigger value="forecast">Forecasting</TabsTrigger>
          </TabsList>
          
          {/* AI Assistant Tab */}
          <TabsContent value="ask">
            <Card>
              <CardHeader>
                <CardTitle>AI Assistant</CardTitle>
                <CardDescription>Ask any question related to rental operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="question">Your Question</Label>
                    <Textarea
                      id="question"
                      placeholder="e.g., What's the best way to handle late guest check-ins?"
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <Button onClick={askQuestion} disabled={isAskLoading}>
                    {isAskLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Asking...
                      </>
                    ) : (
                      "Ask Question"
                    )}
                  </Button>
                  
                  {answer && (
                    <div className="mt-4">
                      <Label>Answer</Label>
                      <div className="p-4 bg-secondary rounded-md whitespace-pre-wrap">
                        {answer}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Generate Insights Tab */}
          <TabsContent value="insights">
            <Card>
              <CardHeader>
                <CardTitle>Generate Insights</CardTitle>
                <CardDescription>Get AI-powered insights for various aspects of your operation</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="insightType">Insight Type</Label>
                    <Select value={insightType} onValueChange={setInsightType}>
                      <SelectTrigger id="insightType">
                        <SelectValue placeholder="Select insight type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bookings">Bookings & Occupancy</SelectItem>
                        <SelectItem value="cleaning">Cleaning Operations</SelectItem>
                        <SelectItem value="maintenance">Maintenance</SelectItem>
                        <SelectItem value="inventory">Inventory Management</SelectItem>
                        <SelectItem value="guests">Guest Management</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button onClick={generateInsights} disabled={isInsightLoading}>
                    {isInsightLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate Insights"
                    )}
                  </Button>
                  
                  {insights && (
                    <div className="mt-4">
                      <Label>Insights</Label>
                      <div className="p-4 bg-secondary rounded-md whitespace-pre-wrap">
                        {insights}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Create SOP Tab */}
          <TabsContent value="sop">
            <Card>
              <CardHeader>
                <CardTitle>Create Standard Operating Procedure</CardTitle>
                <CardDescription>Generate detailed SOP documents for your team</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sopTopic">SOP Topic</Label>
                    <Input
                      id="sopTopic"
                      placeholder="e.g., Guest Check-in Process"
                      value={sopTopic}
                      onChange={(e) => setSopTopic(e.target.value)}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="sopDetails">Details (important information to include)</Label>
                    <Textarea
                      id="sopDetails"
                      placeholder="e.g., Include key pickup, Wi-Fi instructions, property rules explanation, and parking details"
                      value={sopDetails}
                      onChange={(e) => setSopDetails(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <Button onClick={generateSOP} disabled={isSopLoading}>
                    {isSopLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate SOP"
                    )}
                  </Button>
                  
                  {sopResult && (
                    <div className="mt-4">
                      <Label>Standard Operating Procedure</Label>
                      <div className="p-4 bg-secondary rounded-md whitespace-pre-wrap">
                        {sopResult}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Sentiment Analysis Tab */}
          <TabsContent value="sentiment">
            <Card>
              <CardHeader>
                <CardTitle>Sentiment Analysis</CardTitle>
                <CardDescription>Analyze the sentiment of guest reviews and feedback</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="sentimentText">Text to Analyze</Label>
                    <Textarea
                      id="sentimentText"
                      placeholder="Paste guest review or feedback here"
                      value={sentimentText}
                      onChange={(e) => setSentimentText(e.target.value)}
                      className="min-h-[100px]"
                    />
                  </div>
                  
                  <Button onClick={analyzeSentiment} disabled={isSentimentLoading}>
                    {isSentimentLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      "Analyze Sentiment"
                    )}
                  </Button>
                  
                  {sentimentResult && (
                    <div className="mt-4">
                      <Label>Sentiment Analysis Results</Label>
                      <div className="space-y-4 p-4 bg-secondary rounded-md">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Overall Sentiment:</span>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                            sentimentResult.sentiment === "positive" ? "bg-green-100 text-green-800" :
                            sentimentResult.sentiment === "negative" ? "bg-red-100 text-red-800" :
                            "bg-yellow-100 text-yellow-800"
                          }`}>
                            {sentimentResult.sentiment.charAt(0).toUpperCase() + sentimentResult.sentiment.slice(1)}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Score:</span>
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star} className={`text-xl ${
                                star <= sentimentResult.score ? "text-yellow-500" : "text-gray-300"
                              }`}>★</span>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <span className="font-semibold">Key Points:</span>
                          <ul className="list-disc ml-5 mt-2">
                            {sentimentResult.keyPoints.map((point, index) => (
                              <li key={index}>{point}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Forecasting Tab */}
          <TabsContent value="forecast">
            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Forecasting</CardTitle>
                <CardDescription>Generate predictive forecasts for key business metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="forecastType">Forecast Type</Label>
                      <Select value={forecastType} onValueChange={setForecastType}>
                        <SelectTrigger id="forecastType">
                          <SelectValue placeholder="Select forecast type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="revenue">Revenue</SelectItem>
                          <SelectItem value="occupancy">Occupancy Rate</SelectItem>
                          <SelectItem value="maintenance">Maintenance Costs</SelectItem>
                          <SelectItem value="guest_satisfaction">Guest Satisfaction</SelectItem>
                          <SelectItem value="operational_efficiency">Operational Efficiency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="timeframe">Timeframe</Label>
                      <Select value={timeframe} onValueChange={setTimeframe}>
                        <SelectTrigger id="timeframe">
                          <SelectValue placeholder="Select timeframe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="month">Next Month</SelectItem>
                          <SelectItem value="quarter">Next Quarter</SelectItem>
                          <SelectItem value="year">Next Year</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <Button onClick={generateForecast} disabled={isForecastLoading} className="w-full">
                    {isForecastLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating Forecast...
                      </>
                    ) : (
                      "Generate Forecast"
                    )}
                  </Button>
                  
                  {forecastResult && (
                    <div className="mt-6 space-y-6">
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Summary</h3>
                        <div className="p-4 bg-secondary rounded-md">
                          {forecastResult.summary}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Forecast Insights</h3>
                        <div className="space-y-3">
                          {forecastResult.insights.map((insight, index) => (
                            <div key={index} className="p-4 border rounded-md hover:bg-slate-50">
                              <h4 className="font-medium">{insight.title}</h4>
                              <p className="text-sm text-slate-600 mt-1">{insight.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Forecast Data</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-slate-100">
                                <th className="border p-2 text-left">Date</th>
                                <th className="border p-2 text-left">Value</th>
                                <th className="border p-2 text-left">Type</th>
                              </tr>
                            </thead>
                            <tbody>
                              {forecastResult.forecast.map((item, index) => (
                                <tr key={index} className={item.prediction ? "bg-blue-50" : ""}>
                                  <td className="border p-2">{item.date}</td>
                                  <td className="border p-2">{item.value}</td>
                                  <td className="border p-2">
                                    <span className={`px-2 py-1 text-xs rounded-full ${
                                      item.prediction ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
                                    }`}>
                                      {item.prediction ? "Prediction" : "Historical"}
                                    </span>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Container>
    </div>
  );
}