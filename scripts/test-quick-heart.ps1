$Uri = "http://localhost:3000/api/assessments/heart/quick"

$Payload = @{
  anonymous = $true
  anonymous_id = "dev-1"
  answers = @{
    smoking = "Yes"
    bp = "Yes"
    activity = "Mostly inactive - little movement, sitting most of the day"
  }
} | ConvertTo-Json -Depth 4

Invoke-RestMethod -Uri $Uri -Method Post -ContentType "application/json" -Body $Payload
