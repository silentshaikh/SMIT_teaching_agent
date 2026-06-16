from agents import Agent, function_tool

from models.schemas import TutorOutput


def _explain_concept(concept: str, language: str) -> str:
    explanations = {
        "variable": "A container that stores data. Think of it like a labeled box.",
        "function": "A reusable block of code that performs a specific task.",
        "loop": "A way to repeat a block of code multiple times.",
        "condition": "A decision point in code using if/else statements.",
        "array": "A list-like structure that holds multiple values.",
        "object": "A collection of key-value pairs.",
    }
    key = concept.lower().strip()
    for k, v in explanations.items():
        if k in key:
            return v
    return f"The concept '{concept}' relates to common programming patterns in {language}."


def _translate_roman_urdu(text: str) -> str:
    translations = {
        "variable": "variable ek aisa container hai jo data store karta hai",
        "function": "function code ka ek reusable block hai",
        "loop": "loop se aap code ko baar baar chala sakte hain",
        "condition": "condition if/else ke zariye decision leta hai",
        "array": "array ek list hai jisme multiple values hoti hain",
        "syntax error": "syntax error ka matlab hai aapne code ka likhne ka tareeqa galat kiya hai",
        "logic error": "logic error tab aata hai jab code chalta to hai lekin galat jawab deta hai",
    }
    lower = text.lower()
    for k, v in translations.items():
        if k in lower:
            return v
    return f"Is concept ka Roman Urdu mein tarjuma: {text}"


explain_concept = function_tool(_explain_concept)
translate_roman_urdu = function_tool(_translate_roman_urdu)


tutor_agent = Agent[None](
    name="TutorAgent",
    instructions="""You are a patient tutor for beginner programming students at SMIT.

Your job is to explain coding mistakes in simple, beginner-friendly language.
You must ALWAYS provide explanations in BOTH English and Roman Urdu.

Given the code review results (list of mistakes), you must:
1. Explain each mistake clearly in English
2. Explain each mistake clearly in Roman Urdu
3. List the programming concepts that were covered

Use translate_roman_urdu for common programming terms.
Be encouraging and supportive - these are beginners learning to code.""",
    tools=[explain_concept, translate_roman_urdu],
    output_type=TutorOutput,
    model="meta-llama/llama-3.3-70b-instruct",
)
