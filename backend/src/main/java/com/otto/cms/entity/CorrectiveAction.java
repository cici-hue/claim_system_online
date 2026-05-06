package com.otto.cms.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.LocalDate;

@Entity
@Table(name = "corrective_actions")
@Data
public class CorrectiveAction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "claim_id", nullable = false)
    private Claim claim;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    private String owner;
    private LocalDate dueDate;

    @Enumerated(EnumType.STRING)
    private Status status = Status.OPEN;

    public enum Status {
        OPEN, IN_PROGRESS, DONE
    }
}
