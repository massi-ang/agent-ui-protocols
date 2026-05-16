from typing import Dict, Any, List
import uuid

class A2UIGenerator:
    """Generates A2UI JSONL messages from structured data"""
    
    def generate(self, ui_type: str, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate A2UI JSONL messages based on UI type"""
        
        if ui_type == "form":
            return self._generate_form(data)
        elif ui_type == "card":
            return self._generate_card(data)
        elif ui_type == "survey":
            return self._generate_survey(data)
        else:
            return self._generate_card(data)
    
    def _generate_form(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate A2UI form"""
        surface_id = str(uuid.uuid4())
        title = data.get("title", "Form")
        fields = data.get("fields", [])
        
        components = [
            {
                "id": "root",
                "component": {
                    "Column": {
                        "children": {
                            "explicitList": ["title"] + [f"field_{i}" for i in range(len(fields))] + ["submit"]
                        },
                        "spacing": "medium"
                    }
                }
            },
            {
                "id": "title",
                "component": {
                    "Text": {
                        "text": {"literalString": title},
                        "usageHint": "h2"
                    }
                }
            }
        ]
        
        # Add field components
        for i, field in enumerate(fields):
            field_id = f"field_{i}"
            components.append({
                "id": field_id,
                "component": {
                    "TextField": {
                        "label": {"literalString": field.get("label", "")},
                        "placeholder": {"literalString": field.get("placeholder", "")},
                        "value": {"boundVariable": field.get("name", f"field_{i}")}
                    }
                }
            })
        
        # Add submit button
        components.append({
            "id": "submit",
            "component": {
                "Button": {
                    "label": {"literalString": "Submit"},
                    "onClick": {
                        "actions": []
                    }
                }
            }
        })
        
        return [
            {"surfaceUpdate": {"surfaceId": surface_id, "components": components}},
            {"dataModelUpdate": {"surfaceId": surface_id, "path": "/", "contents": {}}},
            {"beginRendering": {"surfaceId": surface_id, "root": "root"}}
        ]
    
    def _generate_card(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate A2UI card"""
        surface_id = str(uuid.uuid4())
        title = data.get("title", "Card")
        card_data = data.get("data", {})
        
        children = ["title"]
        components = [
            {
                "id": "root",
                "component": {
                    "Column": {
                        "children": {"explicitList": children},
                        "spacing": "medium"
                    }
                }
            },
            {
                "id": "title",
                "component": {
                    "Text": {
                        "text": {"literalString": title},
                        "usageHint": "h2"
                    }
                }
            }
        ]
        
        # Add data fields
        for i, (key, value) in enumerate(card_data.items()):
            item_id = f"item_{i}"
            children.append(item_id)
            components.append({
                "id": item_id,
                "component": {
                    "Text": {
                        "text": {"literalString": f"{key}: {value}"},
                        "usageHint": "body"
                    }
                }
            })
        
        # Update root children
        components[0]["component"]["Column"]["children"]["explicitList"] = children
        
        return [
            {"surfaceUpdate": {"surfaceId": surface_id, "components": components}},
            {"dataModelUpdate": {"surfaceId": surface_id, "path": "/", "contents": card_data}},
            {"beginRendering": {"surfaceId": surface_id, "root": "root"}}
        ]
    
    def _generate_survey(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate A2UI survey"""
        surface_id = str(uuid.uuid4())
        title = data.get("title", "Survey")
        fields = data.get("fields", [])
        
        components = [
            {
                "id": "root",
                "component": {
                    "Column": {
                        "children": {
                            "explicitList": ["title"] + [f"q_{i}" for i in range(len(fields))] + ["submit"]
                        },
                        "spacing": "large"
                    }
                }
            },
            {
                "id": "title",
                "component": {
                    "Text": {
                        "text": {"literalString": title},
                        "usageHint": "h2"
                    }
                }
            }
        ]
        
        # Add question components
        for i, field in enumerate(fields):
            q_id = f"q_{i}"
            question = field.get("question", f"Question {i+1}")
            
            if field.get("type") == "choice" and "options" in field:
                # Radio button group (simplified)
                components.append({
                    "id": q_id,
                    "component": {
                        "Column": {
                            "children": {
                                "explicitList": [f"{q_id}_label", f"{q_id}_input"]
                            },
                            "spacing": "small"
                        }
                    }
                })
                components.append({
                    "id": f"{q_id}_label",
                    "component": {
                        "Text": {
                            "text": {"literalString": question},
                            "usageHint": "body"
                        }
                    }
                })
                components.append({
                    "id": f"{q_id}_input",
                    "component": {
                        "TextField": {
                            "placeholder": {"literalString": "Your answer"},
                            "value": {"boundVariable": f"q_{i}"}
                        }
                    }
                })
            else:
                # Text input
                components.append({
                    "id": q_id,
                    "component": {
                        "TextField": {
                            "label": {"literalString": question},
                            "value": {"boundVariable": f"q_{i}"}
                        }
                    }
                })
        
        # Add submit button
        components.append({
            "id": "submit",
            "component": {
                "Button": {
                    "label": {"literalString": "Submit Survey"},
                    "onClick": {"actions": []}
                }
            }
        })
        
        return [
            {"surfaceUpdate": {"surfaceId": surface_id, "components": components}},
            {"dataModelUpdate": {"surfaceId": surface_id, "path": "/", "contents": {}}},
            {"beginRendering": {"surfaceId": surface_id, "root": "root"}}
        ]
