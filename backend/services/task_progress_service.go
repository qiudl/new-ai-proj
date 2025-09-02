package services

import (
	"ai-project-backend/database"
	"ai-project-backend/models"
	"context"
	"math"
)

// TaskProgress 表示任务进度的标准输出
type TaskProgress struct {
	PercentRaw      float64                 `json:"percent_raw"`
	PercentDisplay  int                     `json:"percent_display"`
	EstimateMinutes *int                    `json:"estimate_minutes"`
	ActualMinutes   int                     `json:"actual_minutes"`
	OverrunPercent  int                     `json:"overrun_percent"`
	Completed       bool                    `json:"completed"`
	Breakdown       []TaskProgressBreakdown `json:"breakdown,omitempty"`
}

// TaskProgressBreakdown 子任务进度明细
type TaskProgressBreakdown struct {
	TaskID           int     `json:"id"`
	Title            string  `json:"title"`
	Weight           int     `json:"weight"`
	Progress         float64 `json:"progress"` // 0..1
	Status           string  `json:"status"`
	EstimatedMinutes int     `json:"estimated_minutes"`
	ActualMinutes    int     `json:"actual_minutes"`
}

// TaskProgressService 计算任务进度
// 注意：该服务实现了父任务描述中的算法（权重、封顶95%、completed=100%、Overrun 提示、估算来源优先级等）
type TaskProgressService struct {
	db database.DB
}

func NewTaskProgressService(db database.DB) *TaskProgressService {
	return &TaskProgressService{db: db}
}

// ComputeForTask 计算指定任务ID的进度（仅聚合直接子任务；后续可扩展为多层聚合）
func (s *TaskProgressService) ComputeForTask(ctx context.Context, taskID int) (*TaskProgress, error) {
	// 读取任务
	task, err := s.db.Tasks().GetByID(ctx, taskID)
	if err != nil {
		return nil, err
	}
	if task == nil {
		return nil, nil
	}

	// 尝试读取直接子任务
	children, err := s.db.Tasks().GetChildren(ctx, taskID)
	if err != nil {
		// 即使获取子任务失败，也不阻塞：退化为仅任务级计算
		children = nil
	}

	progress := s.computeFromData(task, children)
	return &progress, nil
}

// computeFromData 根据任务与其直接子任务数据计算进度
func (s *TaskProgressService) computeFromData(task *models.Task, children []*models.Task) TaskProgress {
	// 工具函数
	clamp := func(x, lo, hi float64) float64 {
		if x < lo {
			return lo
		}
		if x > hi {
			return hi
		}
		return x
	}
	stateMap := func(status string) float64 {
		switch status {
		case "completed":
			return 1
		case "in_progress":
			return 0.5
		case "blocked":
			return 0.25
		default:
			return 0
		}
	}

	completed := task.Status == "completed"

	var (
		pRaw      float64
		Etotal    int
		Atotal    int
		breakdown []TaskProgressBreakdown
	)

	if len(children) > 0 {
		// 子任务加权
		acc := 0.0
		wSum := 0
		for _, c := range children {
			Ei := c.EstimatedMinutes
			Ai := c.ActualMinutes
			weight := 1
			if Ei > 0 {
				weight = Ei
			}
			var pi float64
			if c.Status == "completed" {
				pi = 1
			} else if Ei > 0 {
				pi = clamp(float64(Ai)/float64(Ei), 0, 0.95)
			} else {
				pi = stateMap(c.Status)
			}
			acc += float64(weight) * pi
			wSum += weight
			Etotal += maxInt(0, Ei)
			Atotal += maxInt(0, Ai)
			breakdown = append(breakdown, TaskProgressBreakdown{
				TaskID:           c.ID,
				Title:            c.Title,
				Weight:           weight,
				Progress:         pi,
				Status:           c.Status,
				EstimatedMinutes: Ei,
				ActualMinutes:    Ai,
			})
		}
		if wSum > 0 {
			pRaw = acc / float64(wSum)
		} else {
			// 全部无估算时理论上 wSum 不会为0（因为等权=1），这里做保护
			if len(children) > 0 {
				pRaw = acc / float64(len(children))
			}
		}
	} else {
		// 无子任务：按任务级估算/登记 & 状态映射
		E := maxInt(0, task.EstimatedMinutes)
		A := maxInt(0, task.ActualMinutes)
		Etotal = E
		Atotal = A
		if E > 0 {
			pRaw = math.Min(0.95, float64(A)/float64(E))
		} else {
			pRaw = stateMap(task.Status)
		}
	}

	// 完成门槛与封顶
	if completed {
		pRaw = 1
	} else if pRaw > 0.95 {
		pRaw = 0.95
	}

	// Overrun 提示（不改变 p）
	overrun := 0
	if Etotal > 0 && Atotal > Etotal {
		overrun = int(math.Round((float64(Atotal)/float64(Etotal) - 1) * 100))
	}

	// 估算展示：优先子任务估算之和（若至少一个>0），否则任务级
	var estimatePtr *int
	if len(children) > 0 {
		anyEi := false
		for _, c := range children {
			if c.EstimatedMinutes > 0 {
				anyEi = true
				break
			}
		}
		if anyEi {
			E := Etotal
			estimatePtr = &E
		} else if task.EstimatedMinutes > 0 {
			E := task.EstimatedMinutes
			estimatePtr = &E
		}
	} else if task.EstimatedMinutes > 0 {
		E := task.EstimatedMinutes
		estimatePtr = &E
	}

	return TaskProgress{
		PercentRaw:      pRaw,
		PercentDisplay:  int(math.Round(pRaw * 100)),
		EstimateMinutes: estimatePtr,
		ActualMinutes:   Atotal,
		OverrunPercent:  overrun,
		Completed:       completed,
		Breakdown:       breakdown,
	}
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
